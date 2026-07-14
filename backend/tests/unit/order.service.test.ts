import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '@prisma/client';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    userAllergen: { findMany: vi.fn() },
    dishAllergen: { findFirst: vi.fn() },
    dish: { findMany: vi.fn() },
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/emailService', () => ({
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/ai.service', () => ({
  markInteractionOrderPlaced: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('../../src/services/payment.service', () => ({
  createPaymentIntentForOrder: vi.fn(),
}));

import prisma from '../../src/lib/prisma';
import {
  createUnpaidOrder,
  setOrderStatus,
  createOrderAndPaymentIntent,
} from '../../src/services/order.service';
import { createPaymentIntentForOrder } from '../../src/services/payment.service';
import { sendOrderStatusEmail } from '../../src/services/emailService';

describe('order.service', () => {
  beforeEach(() => {
    vi.mocked(prisma.userAllergen.findMany).mockReset();
    vi.mocked(prisma.dishAllergen.findFirst).mockReset();
    vi.mocked(prisma.dish.findMany).mockReset();
    vi.mocked(prisma.order.create).mockReset();
    vi.mocked(prisma.order.update).mockReset();
    vi.mocked(prisma.order.delete).mockReset();
    vi.mocked(createPaymentIntentForOrder).mockReset();
    vi.mocked(sendOrderStatusEmail).mockReset();

    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dishAllergen.findFirst).mockResolvedValue(null);
  });

  it('createUnpaidOrder sums line totals from dish prices and quantities', async () => {
    vi.mocked(prisma.dish.findMany).mockResolvedValue([
      {
        id: 'd1',
        price: 12.5,
        status: 'AVAILABLE',
      },
      {
        id: 'd2',
        price: 4,
        status: 'AVAILABLE',
      },
    ] as never[]);

    vi.mocked(prisma.order.create).mockImplementation((args: { data: { totalPrice: number } }) =>
      Promise.resolve({
        id: 'o-new',
        totalPrice: args.data.totalPrice,
        items: [],
        user: { id: 'u1', name: 'A', email: null },
      } as never)
    );

    const order = await createUnpaidOrder('u1', [
      { dishId: 'd1', quantity: 2 },
      { dishId: 'd2', quantity: 1 },
    ]);

    expect(order.totalPrice).toBe(29);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalPrice: 29,
          finalAmount: 29,
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                dishId: 'd1',
                quantity: 2,
                priceAtOrder: 12.5,
              }),
              expect.objectContaining({
                dishId: 'd2',
                quantity: 1,
                priceAtOrder: 4,
              }),
            ]),
          },
        }),
      })
    );
  });

  it('createUnpaidOrder rejects when some dishIds are unavailable or unknown', async () => {
    vi.mocked(prisma.dish.findMany).mockResolvedValue([
      { id: 'd1', price: 5, status: 'AVAILABLE' },
    ] as never[]);

    await expect(
      createUnpaidOrder('u1', [
        { dishId: 'd1', quantity: 1 },
        { dishId: 'd-missing', quantity: 1 },
      ])
    ).rejects.toMatchObject({ message: 'Some dishes are not available', statusCode: 400 });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('setOrderStatus persists status and sets completedAt for COMPLETED', async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'o1',
      status: OrderStatus.COMPLETED,
      items: [],
      user: { id: 'u1', name: 'A', email: 'a@b.com' },
    } as never);

    await setOrderStatus('o1', OrderStatus.COMPLETED, { sendEmail: false });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: expect.objectContaining({
          status: OrderStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      })
    );
  });

  it('setOrderStatus does not set completedAt for non-terminal preparing states', async () => {
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'o1',
      status: OrderStatus.PREPARING,
      items: [],
      user: { id: 'u1', name: 'A', email: 'a@b.com' },
    } as never);

    await setOrderStatus('o1', OrderStatus.PREPARING, { sendEmail: false });

    const updateArg = vi.mocked(prisma.order.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.completedAt).toBeUndefined();
  });

  it('createOrderAndPaymentIntent deletes the order when payment intent creation fails', async () => {
    vi.mocked(prisma.dish.findMany).mockResolvedValue([
      { id: 'd1', price: 10, status: 'AVAILABLE' },
    ] as never[]);
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'o-fail',
      totalPrice: 10,
      finalAmount: 10,
      items: [{ dishId: 'd1', quantity: 1, priceAtOrder: 10 }],
      user: { id: 'u1', name: 'A', email: null },
    } as never);
    vi.mocked(createPaymentIntentForOrder).mockRejectedValue(new Error('stripe down'));
    vi.mocked(prisma.order.delete).mockResolvedValue({} as never);

    await expect(
      createOrderAndPaymentIntent({
        userId: 'u1',
        items: [{ dishId: 'd1', quantity: 1 }],
      })
    ).rejects.toThrow('stripe down');

    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: 'o-fail' } });
  });

  it('duplicate-order guard: service allows back-to-back identical carts (no dedupe in service layer)', async () => {
    vi.mocked(prisma.dish.findMany).mockResolvedValue([
      { id: 'd1', price: 8, status: 'AVAILABLE' },
    ] as never[]);
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'o1',
      totalPrice: 8,
      items: [],
      user: { id: 'u1', name: 'A', email: null },
    } as never);

    await createUnpaidOrder('u1', [{ dishId: 'd1', quantity: 1 }]);
    await createUnpaidOrder('u1', [{ dishId: 'd1', quantity: 1 }]);

    expect(prisma.order.create).toHaveBeenCalledTimes(2);
  });
});
