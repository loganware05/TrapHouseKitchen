import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PaymentRecordStatus } from '@prisma/client';

const { buildBudgetMealMock } = vi.hoisted(() => ({
  buildBudgetMealMock: vi.fn(),
}));

vi.mock('../../src/middleware/rateLimiter', async () => {
  const { default: rateLimit } = await import('express-rate-limit');
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    apiLimiter: pass,
    authLimiter: pass,
    paymentLimiter: pass,
    orderLimiter: rateLimit({
      windowMs: 60_000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  };
});

vi.mock('../../src/services/ai.service', () => ({
  buildBudgetMeal: (...args: unknown[]) => buildBudgetMealMock(...args),
  recordComboSelection: vi.fn().mockResolvedValue(undefined),
}));

import '../mocks/stripeModule';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { stripeTestFns } from '../mocks/stripeModule';
import { AppError } from '../../src/middleware/errorHandler';

function rawWebhookPost(body: object) {
  return request(app)
    .post('/api/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(body));
}

describe('Failure simulations (resilience)', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = '';
    buildBudgetMealMock.mockReset();
    stripeTestFns.paymentIntentsCreate.mockClear();
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
                card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034 },
              },
            },
          ],
        },
      })
    );
    stripeTestFns.paymentIntentsCreate.mockImplementation(() =>
      Promise.resolve({
        id: `pi_failsim_${randomUUID().slice(0, 10)}`,
        status: 'requires_payment_method' as const,
        client_secret: 'cs_failsim',
      })
    );
    stripeTestFns.paymentIntentsCancel.mockResolvedValue({});
  });

  it('duplicate Stripe webhook delivery does not create duplicate charge transactions', async () => {
    const piId = `pi_fail_dup_${randomUUID().slice(0, 12)}`;
    const chargeId = piId.replace(/^pi_/, 'ch_');
    const hashed = await bcrypt.hash('pw', 10);
    const user = await prisma.user.create({
      data: {
        email: `integration-faildup-${randomUUID().slice(0, 8)}@example.com`,
        name: 'Dup User',
        password: hashed,
        role: 'CUSTOMER',
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `FailDup Cat ${randomUUID().slice(0, 8)}`,
        description: 'x',
        displayOrder: 1,
      },
    });
    const dish = await prisma.dish.create({
      data: {
        name: `FailDup Dish ${randomUUID().slice(0, 8)}`,
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
        stripePaymentIntentId: piId,
        amount: 9.99,
        tipAmount: 0,
        totalAmount: 9.99,
        currency: 'usd',
        status: PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
        paymentMethod: 'CARD',
      },
    });

    const event = {
      id: `evt_fail_dup_${randomUUID().slice(0, 10)}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: piId,
          amount: Math.round(9.99 * 100),
          currency: 'usd',
          metadata: { orderId: order.id },
        },
      },
    };

    await rawWebhookPost(event).expect(200);
    await rawWebhookPost(event).expect(200);

    const txs = await prisma.transaction.findMany({
      where: { paymentId: payment.id, stripeChargeId: chargeId },
    });
    expect(txs).toHaveLength(1);
  });

  it('POST /api/orders rejects non-existent dishId without leaving partial order (FK / validation)', async () => {
    const fwd = `203.0.113.${(randomUUID().charCodeAt(0) % 200) + 1}`;
    const reg = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', fwd)
      .send({
        email: `integration-baddish-${randomUUID().slice(0, 10)}@example.com`,
        password: 'secret1234',
        name: 'Bad Dish User',
      })
      .expect(201);
    const token = reg.body.data.token as string;
    const fakeDishId = randomUUID();

    const res = await request(app)
      .post('/api/orders')
      .set('X-Forwarded-For', fwd)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ dishId: fakeDishId, quantity: 1 }] })
      .expect(400);
    expect(res.body.message).toBeTruthy();

    const orderCount = await prisma.order.count({
      where: { userId: reg.body.data.user.id },
    });
    expect(orderCount).toBe(0);
  });

  it('second checkout within rate limit window returns 429', async () => {
    const fwd = '203.0.113.77';
    const email = `integration-dbcheckout-${randomUUID().slice(0, 10)}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', fwd)
      .send({ email, password: 'secret1234', name: 'Rate User' })
      .expect(201);
    const token = reg.body.data.token as string;

    const category = await prisma.category.create({
      data: {
        name: `Rate Cat ${randomUUID().slice(0, 8)}`,
        description: 'c',
        displayOrder: 1,
      },
    });
    const dish = await prisma.dish.create({
      data: {
        name: `Rate Dish ${randomUUID().slice(0, 8)}`,
        description: 'd',
        price: 14,
        categoryId: category.id,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });

    const body = {
      items: [{ dishId: dish.id, quantity: 1 }],
      tipAmount: 0,
    };

    await request(app)
      .post('/api/orders/checkout')
      .set('X-Forwarded-For', fwd)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    await request(app)
      .post('/api/orders/checkout')
      .set('X-Forwarded-For', fwd)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(429);
  });

  it('POST /api/ai/build-meal surfaces AI failures as 503', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        email: `integration-aitimeout-${randomUUID().slice(0, 10)}@example.com`,
        password: 'secret1234',
        name: 'AI Fail User',
      })
      .expect(201);
    const token = reg.body.data.token as string;

    buildBudgetMealMock.mockRejectedValue(
      new AppError('Our recommendation service timed out. Try again in a moment.', 503)
    );

    await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({ budget: 15 })
      .expect(503);
  });

  it('checkout ignores client-supplied amount; Stripe uses server-computed total', async () => {
    const fwd = '203.0.113.88';
    const email = `integration-tamper-${randomUUID().slice(0, 10)}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .set('X-Forwarded-For', fwd)
      .send({ email, password: 'secret1234', name: 'Tamper User' })
      .expect(201);
    const token = reg.body.data.token as string;

    const category = await prisma.category.create({
      data: {
        name: `Tamper Cat ${randomUUID().slice(0, 8)}`,
        description: 'c',
        displayOrder: 1,
      },
    });
    const dish = await prisma.dish.create({
      data: {
        name: `Tamper Dish ${randomUUID().slice(0, 8)}`,
        description: 'd',
        price: 22.5,
        categoryId: category.id,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });

    const res = await request(app)
      .post('/api/orders/checkout')
      .set('X-Forwarded-For', fwd)
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId: dish.id, quantity: 1 }],
        tipAmount: 0,
        amount: 0.01,
      })
      .expect(201);

    expect(res.body.data.amount).toBeCloseTo(22.5, 5);
    const piArgs = stripeTestFns.paymentIntentsCreate.mock.calls[0][0] as { amount: number };
    expect(piArgs.amount).toBe(2250);
  });
});
