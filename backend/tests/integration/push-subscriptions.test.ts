import { describe, it, expect, beforeAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { createTestDish, createTestUser, testEmail } from '../factories';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

import webpush from 'web-push';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token as string;
}

describe('Web Push subscriptions + status gating', () => {
  const runId = randomUUID().slice(0, 8);
  const password = 'test-password-123';
  let hashedPassword: string;
  let customerAToken: string;
  let customerBToken: string;
  let chefToken: string;
  let customerAId: string;
  let orderId: string;

  const endpointA = `https://fcm.googleapis.com/fcm/send/test-a-${runId}`;
  const endpointB = `https://fcm.googleapis.com/fcm/send/test-b-${runId}`;

  beforeAll(async () => {
    // Test-only placeholders (not production VAPID material).
    process.env.VAPID_PUBLIC_KEY =
      process.env.VAPID_PUBLIC_KEY ||
      'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    process.env.VAPID_PRIVATE_KEY =
      process.env.VAPID_PRIVATE_KEY || 'TEST_ONLY_VAPID_PRIVATE_KEY_PLACEHOLDER';
    process.env.VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:test@example.com';

    hashedPassword = await bcrypt.hash(password, 10);

    const chef = await createTestUser({
      email: testEmail(`integration-push-chef-${runId}`),
      password: hashedPassword,
      role: 'CHEF',
    });
    const customerA = await createTestUser({
      email: testEmail(`integration-push-a-${runId}`),
      password: hashedPassword,
    });
    const customerB = await createTestUser({
      email: testEmail(`integration-push-b-${runId}`),
      password: hashedPassword,
    });
    customerAId = customerA.id;

    chefToken = await loginAs(chef.email!, password);
    customerAToken = await loginAs(customerA.email!, password);
    customerBToken = await loginAs(customerB.email!, password);

    const dish = await createTestDish({ name: `Integration Push Dish ${runId}` });
    const order = await prisma.order.create({
      data: {
        userId: customerA.id,
        status: 'PENDING',
        paymentStatus: 'PAID',
        totalPrice: dish.price,
        tipAmount: 0,
        finalAmount: dish.price,
        deliveryLocation: 'Harvey Hall',
        items: {
          create: [{ dishId: dish.id, quantity: 1, priceAtOrder: dish.price }],
        },
      },
    });
    orderId = order.id;
  });

  it('rejects unauthenticated subscribe', async () => {
    const res = await request(app).post('/api/push/subscribe').send({
      endpoint: endpointA,
      keys: { p256dh: 'p256dh-a', auth: 'auth-a' },
    });
    expect(res.status).toBe(401);
  });

  it('subscribes for the authenticated user only', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({
        endpoint: endpointA,
        keys: { p256dh: 'p256dh-a', auth: 'auth-a' },
      });
    expect(res.status).toBe(201);

    const list = await request(app)
      .get('/api/push/subscriptions')
      .set('Authorization', `Bearer ${customerAToken}`);
    expect(list.status).toBe(200);
    expect(list.headers['cache-control']).toMatch(/private/);
    expect(list.body.data.enabled).toBe(true);
    expect(list.body.data.subscriptions).toHaveLength(1);
    expect(list.body.data.subscriptions[0].endpoint).toBe(endpointA);
  });

  it('prevents user B from unsubscribing user A endpoint', async () => {
    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({
        endpoint: endpointB,
        keys: { p256dh: 'p256dh-b', auth: 'auth-b' },
      });

    const res = await request(app)
      .delete('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${customerBToken}`)
      .send({ endpoint: endpointA });
    expect(res.status).toBe(403);

    const stillThere = await prisma.pushSubscription.findUnique({
      where: { endpoint: endpointA },
    });
    expect(stillThere?.userId).toBe(customerAId);
  });

  it('sends push on PREPARING / READY / OUT_FOR_DELIVERY but not COMPLETED', async () => {
    async function waitForPushCalls(min = 1, timeoutMs = 2000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (vi.mocked(webpush.sendNotification).mock.calls.length >= min) return;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(
        `expected >= ${min} push sends, got ${vi.mocked(webpush.sendNotification).mock.calls.length}`
      );
    }

    for (const status of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY'] as const) {
      vi.mocked(webpush.sendNotification).mockClear();
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${chefToken}`)
        .send({ status });
      expect(res.status).toBe(200);
      await waitForPushCalls(1);
      const payload = JSON.parse(String(vi.mocked(webpush.sendNotification).mock.calls[0][1]));
      expect(payload.data.status).toBe(status);
    }

    vi.mocked(webpush.sendNotification).mockClear();
    const completed = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);
    await new Promise((r) => setTimeout(r, 150));
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('supports logout-style unsubscribe all for owner only', async () => {
    const res = await request(app)
      .delete('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${customerAToken}`)
      .send({ all: true });
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBeGreaterThanOrEqual(1);

    const gone = await prisma.pushSubscription.findUnique({
      where: { endpoint: endpointA },
    });
    expect(gone).toBeNull();

    const other = await prisma.pushSubscription.findUnique({
      where: { endpoint: endpointB },
    });
    expect(other).not.toBeNull();
  });
});
