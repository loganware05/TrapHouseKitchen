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
  const runId = randomUUID().slice(0, 8); // stable per file; PI ids use this + suffix per test

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
              // Unique per PaymentIntent so parallel integration tests never collide on Transaction.stripeChargeId
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

  it('payment_intent.succeed marks order paid and creates charge transaction', async () => {
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

  it('payment_intent.canceled marks payment canceled and order payment failed', async () => {
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
    expect(o?.paymentStatus).toBe('FAILED');
  });

  it('charge.refunded full refund updates order to refunded and cancelled', async () => {
    const piId = `pi_wh_ref_${runId}`;
    const chargeId = piId.replace(/^pi_/, 'ch_');
    const { order, payment } = await seedUserAndPayment(piId);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentRecordStatus.SUCCEEDED },
    });
    await prisma.transaction.create({
      data: {
        paymentId: payment.id,
        type: 'CHARGE',
        amount: payment.totalAmount,
        status: 'succeeded',
        stripeChargeId: chargeId,
      },
    });

    const event = {
      id: `evt_ref_${runId}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: chargeId,
          amount: Math.round(payment.totalAmount * 100),
          amount_refunded: Math.round(payment.totalAmount * 100),
          currency: 'usd',
        },
      },
    };

    await rawPost(event).expect(200);

    const pay = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(pay?.status).toBe(PaymentRecordStatus.REFUNDED);
    const o = await prisma.order.findUnique({ where: { id: order.id } });
    expect(o?.paymentStatus).toBe('REFUNDED');
    expect(o?.status).toBe('CANCELLED');
  });

  it('setup_intent.succeeded persists saved payment method for user', async () => {
    const hashed = await bcrypt.hash('pw', 10);
    const user = await prisma.user.create({
      data: {
        email: `integration-wh-si-${randomUUID().slice(0, 10)}@example.com`,
        name: 'SI User',
        password: hashed,
        role: 'CUSTOMER',
      },
    });

    const pmId = `pm_si_${randomUUID().slice(0, 12)}`;

    const event = {
      id: `evt_si_${runId}`,
      type: 'setup_intent.succeeded',
      data: {
        object: {
          id: `seti_${runId}`,
          status: 'succeeded',
          metadata: { userId: user.id },
          payment_method: pmId,
        },
      },
    };

    await rawPost(event).expect(200);

    const rows = await prisma.savedPaymentMethod.findMany({ where: { userId: user.id } });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.stripePaymentMethodId === pmId)).toBe(true);
  });
});
