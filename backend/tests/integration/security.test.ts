import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('Security: authz, rate limits, webhook hardening', () => {
  const runId = randomUUID().slice(0, 8);

  it('customer cannot access GET /api/reviews/pending', async () => {
    const email = `integration-sec-pend-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret1234', name: 'Sec User' })
      .expect(201);

    await request(app)
      .get('/api/reviews/pending')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .expect(403);
  });

  it('customer cannot POST /api/orders/archive-completed', async () => {
    const email = `integration-sec-arch-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret1234', name: 'Sec Arch' })
      .expect(201);

    await request(app)
      .post('/api/orders/archive-completed')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .expect(403);
  });

  it('customer cannot POST /api/categories', async () => {
    const email = `integration-sec-cat-${runId}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret1234', name: 'Sec Cat' })
      .expect(201);

    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${reg.body.data.token}`)
      .send({ name: `Evil Category ${runId}` })
      .expect(403);
  });

  it('auth limiter blocks repeated failed logins (unique IP)', async () => {
    const email = `integration-sec-rl-${runId}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'correctHorse123', name: 'RL User' })
      .expect(201);

    const fakeIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', fakeIp)
        .send({ email, password: 'wrong-password' })
        .expect(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', fakeIp)
      .send({ email, password: 'wrong-password' })
      .expect(429);

    expect(blocked.body.message || blocked.body.status).toBeTruthy();
  });

  it('POST /api/webhooks/stripe returns 503 in production without STRIPE_WEBHOOK_SECRET', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    try {
      await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ id: 'evt_test', type: 'ping' })))
        .expect(503);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevSecret !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
    }
  });

  it('POST /api/webhooks/stripe rejects invalid signature when secret is configured (production)', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_for_invalid_sig';

    try {
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=123,v1=deadbeef')
        .send(Buffer.from(JSON.stringify({ id: 'evt_test', type: 'payment_intent.succeeded' })));
      expect(res.status).toBe(400);
      expect(String(res.text || res.body)).toMatch(/webhook|signature|error/i);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevSecret !== undefined) process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });

  it('customer B cannot GET customer A order by id', async () => {
    const bcryptMod = await import('bcryptjs');
    const emailA = `integration-sec-a-${runId}@example.com`;
    const emailB = `integration-sec-b-${runId}@example.com`;

    const userA = await prisma.user.create({
      data: {
        email: emailA,
        name: 'Test Order Owner A',
        password: await bcryptMod.default.hash('custPass123', 10),
        role: 'CUSTOMER',
      },
    });
    await prisma.user.create({
      data: {
        email: emailB,
        name: 'Test Intruder B',
        password: await bcryptMod.default.hash('custPass456', 10),
        role: 'CUSTOMER',
      },
    });

    const dish = await prisma.dish.findFirst({
      where: { status: 'AVAILABLE' },
    });
    if (!dish) {
      await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
      return;
    }

    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        totalPrice: dish.price,
        finalAmount: dish.price,
        paymentStatus: 'PAID',
        status: 'PENDING',
        items: {
          create: [
            {
              dishId: dish.id,
              quantity: 1,
              priceAtOrder: dish.price,
            },
          ],
        },
      },
    });

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: emailB, password: 'custPass456' })
      .expect(200);

    await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Authorization', `Bearer ${loginB.body.data.token}`)
      .expect(403);

    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.user.deleteMany({
      where: { email: { in: [emailA, emailB] } },
    });
  });
});
