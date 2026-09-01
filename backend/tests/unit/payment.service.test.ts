import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentRecordStatus } from '@prisma/client';

const { paymentIntentsCreate, paymentIntentsCancel, mockPrisma } = vi.hoisted(() => {
  const paymentIntentsCreate = vi.fn();
  const paymentIntentsCancel = vi.fn();
  const mockPrisma = {
    order: { findUnique: vi.fn(), update: vi.fn(), groupBy: vi.fn() },
    payment: { findFirst: vi.fn(), create: vi.fn() },
    coupon: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    savedPaymentMethod: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return { paymentIntentsCreate, paymentIntentsCancel, mockPrisma };
});

vi.mock('../../src/lib/stripe', () => ({
  __esModule: true,
  default: {
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_unit' }) },
    paymentIntents: {
      create: (...a: unknown[]) => paymentIntentsCreate(...a),
      cancel: (...a: unknown[]) => paymentIntentsCancel(...a),
      retrieve: vi.fn(),
    },
    paymentMethods: {
      retrieve: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
    },
    setupIntents: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
    refunds: { create: vi.fn() },
  },
  toStripeAmount: (n: number) => Math.round(n * 100),
  fromStripeAmount: (n: number) => n / 100,
  calculatePrepTime: (itemCount: number) => 15 + 5 * itemCount,
  paymentIntentStatusToRecordStatus: (status: string) => {
    const map: Record<string, PaymentRecordStatus> = {
      requires_payment_method: PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
      succeeded: PaymentRecordStatus.SUCCEEDED,
    };
    return map[status] ?? PaymentRecordStatus.REQUIRES_PAYMENT_METHOD;
  },
}));

vi.mock('../../src/lib/prisma', () => ({
  default: {
    ...mockPrisma,
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));

import {
  createPaymentIntentForOrder,
  finalizeCouponAfterPayment,
} from '../../src/services/payment.service';

describe('payment.service', () => {
  beforeEach(() => {
    paymentIntentsCreate.mockReset();
    paymentIntentsCancel.mockReset();
    mockPrisma.order.findUnique.mockReset();
    mockPrisma.order.update.mockReset();
    mockPrisma.order.groupBy.mockReset();
    mockPrisma.payment.findFirst.mockReset();
    mockPrisma.payment.create.mockReset();
    mockPrisma.coupon.findUnique.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.savedPaymentMethod.findFirst.mockReset();
    mockPrisma.coupon.updateMany.mockReset();

    paymentIntentsCreate.mockResolvedValue({
      id: 'pi_unit_test',
      status: 'requires_payment_method',
      client_secret: 'cs_unit',
    });
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.coupon.findUnique.mockResolvedValue(null);
    mockPrisma.order.groupBy.mockResolvedValue([]);
  });

  const baseOrder = (overrides: Partial<{ totalPrice: string; userId: string; appliedCouponId: string | null }> = {}) => ({
    id: 'ord-1',
    userId: overrides.userId ?? 'user-1',
    totalPrice: overrides.totalPrice ?? 20,
    appliedCouponId: overrides.appliedCouponId ?? null,
    items: [{ dish: { id: 'd1', name: 'Burger', price: 10 }, quantity: 2 }],
    user: { id: 'user-1', name: 'U', email: 'u@test.com' },
  });

  it('createPaymentIntentForOrder throws 404 when order is missing', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);
    await expect(
      createPaymentIntentForOrder({ userId: 'user-1', orderId: 'missing' })
    ).rejects.toMatchObject({ message: 'Order not found', statusCode: 404 });
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('createPaymentIntentForOrder throws 403 when user does not own the order', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder({ userId: 'other' }));
    await expect(
      createPaymentIntentForOrder({ userId: 'user-1', orderId: 'ord-1' })
    ).rejects.toMatchObject({ message: 'Unauthorized to pay for this order', statusCode: 403 });
  });

  it('createPaymentIntentForOrder throws 400 when order already has a succeeded payment', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder());
    mockPrisma.payment.findFirst.mockResolvedValueOnce({ id: 'pay-old', status: 'SUCCEEDED' });
    await expect(
      createPaymentIntentForOrder({ userId: 'user-1', orderId: 'ord-1' })
    ).rejects.toMatchObject({ message: 'Order has already been paid', statusCode: 400 });
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('createPaymentIntentForOrder throws 400 when coupon code mismatches applied coupon', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder({ appliedCouponId: 'coup-1' }));
    mockPrisma.coupon.findUnique.mockResolvedValueOnce({
      id: 'coup-1',
      code: 'REALCODE',
      userId: 'user-1',
      used: false,
      expiresAt: null,
      discountAmount: 3,
    });

    await expect(
      createPaymentIntentForOrder({
        userId: 'user-1',
        orderId: 'ord-1',
        couponCode: 'WRONGCODE',
      })
    ).rejects.toMatchObject({
      message: 'Coupon code does not match the coupon applied to this order',
      statusCode: 400,
    });
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('createPaymentIntentForOrder passes server-computed total to Stripe (subtotal + tip − discount)', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder({ totalPrice: 18 }),
      appliedCouponId: 'coup-1',
    });
    mockPrisma.coupon.findUnique.mockResolvedValue({
      id: 'coup-1',
      code: 'TENOFF',
      userId: 'user-1',
      used: false,
      expiresAt: null,
      discountAmount: 3,
    });
    mockPrisma.payment.create.mockResolvedValue({
      id: 'pay-1',
      orderId: 'ord-1',
      stripePaymentIntentId: 'pi_unit_test',
    });
    mockPrisma.order.update.mockResolvedValue({
      ...baseOrder({ totalPrice: 18 }),
      tipAmount: 2,
      finalAmount: 17,
      prepTime: 25,
      paymentStatus: 'PENDING',
    });

    const result = await createPaymentIntentForOrder({
      userId: 'user-1',
      orderId: 'ord-1',
      tipAmount: 2,
    });

    expect(result.amount).toBeCloseTo(17, 5);
    const piArg = paymentIntentsCreate.mock.calls[0][0] as { amount: number };
    expect(piArg.amount).toBe(1700);
  });

  it('createPaymentIntentForOrder can create another PI when existing payments are not succeeded (no pending dedupe)', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder());
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay-a', orderId: 'ord-1' });
    mockPrisma.order.update.mockResolvedValue({
      ...baseOrder(),
      tipAmount: 0,
      finalAmount: 20,
      prepTime: 25,
      paymentStatus: 'PENDING',
    });

    await createPaymentIntentForOrder({ userId: 'user-1', orderId: 'ord-1' });
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay-b', orderId: 'ord-1' });
    await createPaymentIntentForOrder({ userId: 'user-1', orderId: 'ord-1' });
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(2);
  });

  it('createPaymentIntentForOrder cancels Stripe PI when persisting the Payment row fails', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder());
    mockPrisma.payment.create.mockRejectedValueOnce(new Error('db write failed'));
    paymentIntentsCancel.mockResolvedValue({});

    await expect(
      createPaymentIntentForOrder({ userId: 'user-1', orderId: 'ord-1' })
    ).rejects.toThrow('db write failed');
    expect(paymentIntentsCancel).toHaveBeenCalledWith('pi_unit_test');
  });

  it('finalizeCouponAfterPayment marks coupon used when still unused', async () => {
    mockPrisma.coupon.updateMany.mockResolvedValueOnce({ count: 1 });
    await finalizeCouponAfterPayment('ord-1', 'coup-1');

    expect(mockPrisma.coupon.updateMany).toHaveBeenCalledWith({
      where: { id: 'coup-1', used: false },
      data: { used: true, usedOrderId: 'ord-1' },
    });
  });

  it('finalizeCouponAfterPayment is a no-op when couponId is null', async () => {
    await finalizeCouponAfterPayment('ord-1', null);
    expect(mockPrisma.coupon.updateMany).not.toHaveBeenCalled();
  });
});
