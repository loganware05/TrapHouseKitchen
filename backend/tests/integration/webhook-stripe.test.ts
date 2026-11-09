import '../mocks/stripeModule';
import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { PaymentRecordStatus } from '@prisma/client';
import { stripeTestFns } from '../mocks/stripeModule';

function rawPost(body: object) {
  return request(app)
    .post('/api/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(body));
}

describe('Stripe webhooks', () => {
  const runId = randomUUID().slice(0, 8);

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = '';
    stripeTestFns.paymentIntentsRetrieve.mockImplementation((piId: string) =>
      Promise.resolve({
        id: piId,
        amount: 999,
        currency: 'usd',
        metadata: {},
        charges: {
          data: [
            {
              id: piId.replace(/^pi_/, 'ch_'),
              receipt_url: 'https://pay.stripe.com/receipts/test',
              payment_method_details: {
                card: {
                  brand: 'visa',
                  last4: '4242',
                  exp_month: 12,
                  exp_year: 2034,
                },
              },
            },
          ],
        },
      })
    );
  });

  async function seedUserAndPayment(paymentIntentId: string) {
    const hashed = await bcrypt.hash('pw', 10);
    const user = await prisma.user.create({
      data: {
        email: `integration-wh-${runId}-${randomUUID().slice(0, 4)}@example.com`,
        name: 'WH User',
        password: hashed,
        role: 'CUSTOMER',
      },
    });

    const uniq = randomUUID().slice(0, 10);
    const category = await prisma.category.create({
      data: {
        name: `Integration WH Cat ${uniq}`,
        description: 'x',
        displayOrder: 1,
      },
    });
    const dish = await prisma.dish.create({
      data: {
        name: `Integration WH Dish ${uniq}`,
        description: 'd',
        price: 9.99,
        categoryId: category.id,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 9.99,
        tipAmount: 0,
        finalAmount: 9.99,
        items: {
          create: [{ dishId: dish.id, quantity: 1, priceAtOrder: 9.99 }],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntentId,
        amount: 9.99,
        tipAmount: 0,
        totalAmount: 9.99,
        currency: 'usd',
        status: PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
        paymentMethod: 'CARD',
      },
    });

    return { user, order, payment, dish, category };
  }

  it('payment_intent.succeeded marks order paid and creates charge transaction', async () => {
    const piId = `pi_wh_ok_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    const event = {
      id: `evt_pi_ok_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    };

    await rawPost(event).expect(200);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.paymentStatus).toBe('PAID');

    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.SUCCEEDED);

    const txs = await prisma.transaction.findMany({ where: { paymentId: payment.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('CHARGE');
    expect(txs[0].stripeChargeId).toBe(piId.replace(/^pi_/, 'ch_'));
  });

  it('payment_intent.succeeded after fulfillment advance keeps PREPARING and marks PAID', async () => {
    const piId = `pi_wh_prep_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PREPARING' },
    });

    const event = {
      id: `evt_prep_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    };

    await rawPost(event).expect(200);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('PREPARING');
    expect(updated?.paymentStatus).toBe('PAID');

    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.SUCCEEDED);
  });

  it('payment_intent.succeeded is idempotent on Stripe retries (duplicate charge row rejected)', async () => {
    const piId = `pi_wh_dup_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    const event = {
      id: `evt_dup_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    };

    await rawPost(event).expect(200);
    await rawPost(event).expect(200);

    const txs = await prisma.transaction.findMany({
      where: { paymentId: payment.id, stripeChargeId: piId.replace(/^pi_/, 'ch_') },
    });
    expect(txs).toHaveLength(1);
  });

  it('payment_intent.payment_failed updates payment and order', async () => {
    const piId = `pi_wh_fail_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    const event = {
      id: `evt_fail_${runId}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: piId,
          last_payment_error: { message: 'card declined' },
        },
      },
    };

    await rawPost(event).expect(200);

    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.FAILED);
    expect(pay?.failureReason).toContain('declined');

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('FAILED');
  });

  it('payment_intent.canceled marks payment canceled and order status CANCELLED', async () => {
    const piId = `pi_wh_can_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    const event = {
      id: `evt_can_${runId}`,
      type: 'payment_intent.canceled',
      data: { object: { id: piId } },
    };

    await rawPost(event).expect(200);

    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.CANCELED);
    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.status).toBe('CANCELLED');
  });

  it('concurrent succeeded finalization creates a single CHARGE and leaves coupon consumed once', async () => {
    const { finalizeSuccessfulPayment } = await import(
      '../../src/services/paymentFinalization.service'
    );
    const piId = `pi_wh_race_${runId}`;
    const { order, payment, user } = await seedUserAndPayment(piId);

    const coupon = await prisma.coupon.create({
      data: {
        code: `RACE${runId}`.toUpperCase().slice(0, 12),
        userId: user.id,
        discountAmount: 2,
        used: false,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { appliedCouponId: coupon.id },
    });

    const paymentIntent = {
      id: piId,
      amount: 999,
      currency: 'usd',
      metadata: { orderId: order.id },
      charges: {
        data: [
          {
            id: piId.replace(/^pi_/, 'ch_'),
            receipt_url: 'https://pay.stripe.com/receipts/test',
            payment_method_details: {
              card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034 },
            },
          },
        ],
      },
    } as any;

    await Promise.all([
      finalizeSuccessfulPayment(paymentIntent, { sendEmails: false }),
      finalizeSuccessfulPayment(paymentIntent, { sendEmails: false }),
      finalizeSuccessfulPayment(paymentIntent, { sendEmails: false }),
    ]);

    const txs = await prisma.transaction.findMany({
      where: { paymentId: payment.id, type: 'CHARGE' },
    });
    expect(txs).toHaveLength(1);

    const updatedCoupon = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    expect(updatedCoupon?.used).toBe(true);
    expect(updatedCoupon?.usedOrderId).toBe(order.id);

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('PAID');
  });

  it('payment_failed after PAID does not downgrade paymentStatus', async () => {
    const piId = `pi_wh_fail_after_${runId}`;
    const { order } = await seedUserAndPayment(piId);

    await rawPost({
      id: `evt_ok_then_fail_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    }).expect(200);

    await rawPost({
      id: `evt_fail_late_${runId}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: piId,
          last_payment_error: { message: 'late decline noise' },
        },
      },
    }).expect(200);

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('PAID');
    const pay = await prisma.payment.findFirst({ where: { orderId: order.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.SUCCEEDED);
  });

  it('charge.refunded is idempotent and marks full refund', async () => {
    const piId = `pi_wh_ref_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);
    const chargeId = piId.replace(/^pi_/, 'ch_');
    const refundId = `re_${runId}`;

    await rawPost({
      id: `evt_ref_ok_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    }).expect(200);

    const refundEvent = {
      id: `evt_ref_${runId}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: chargeId,
          amount: 999,
          amount_refunded: 999,
          refunds: {
            data: [{ id: refundId, amount: 999, status: 'succeeded' }],
          },
        },
      },
    };

    await rawPost(refundEvent).expect(200);
    await rawPost({ ...refundEvent, id: `evt_ref_dup_${runId}` }).expect(200);

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('REFUNDED');
    expect(o?.status).toBe('CANCELLED');

    const refunds = await prisma.transaction.findMany({
      where: { paymentId: payment.id, type: { in: ['REFUND', 'PARTIAL_REFUND'] } },
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0].stripeRefundId).toBe(refundId);
  });

  it('payment_intent.succeeded after REFUNDED does not revive order to PAID', async () => {
    const piId = `pi_wh_revive_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);
    const chargeId = piId.replace(/^pi_/, 'ch_');

    await rawPost({
      id: `evt_revive_ok_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    }).expect(200);

    await rawPost({
      id: `evt_revive_ref_${runId}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: chargeId,
          amount: 999,
          amount_refunded: 999,
          refunds: {
            data: [{ id: `re_revive_${runId}`, amount: 999, status: 'succeeded' }],
          },
        },
      },
    }).expect(200);

    await rawPost({
      id: `evt_revive_ok2_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    }).expect(200);

    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('REFUNDED');
    expect(o?.status).toBe('CANCELLED');
    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.REFUNDED);
  });

  it('decline then succeeded retry marks PAID with a single CHARGE', async () => {
    const piId = `pi_wh_retry_${runId}`;
    const { order, payment } = await seedUserAndPayment(piId);

    await rawPost({
      id: `evt_retry_fail_${runId}`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: piId,
          last_payment_error: { message: 'card declined' },
        },
      },
    }).expect(200);

    let o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('FAILED');

    await rawPost({
      id: `evt_retry_ok_${runId}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: 999,
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    }).expect(200);

    o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('PAID');
    const txs = await prisma.transaction.findMany({
      where: { paymentId: payment.id, type: 'CHARGE' },
    });
    expect(txs).toHaveLength(1);
  });
});
