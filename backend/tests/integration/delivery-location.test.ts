import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { createTestDish, createTestUser, testEmail } from '../factories';

describe('Delivery location on checkout', () => {
  const runId = randomUUID().slice(0, 8);
  let token: string;
  let dishId: string;

  beforeAll(async () => {
    const password = 'test-password-123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await createTestUser({
      email: testEmail(`integration-delivery-${runId}`),
      password: hashedPassword,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: customer.email, password });
    token = login.body.data.token;

    const dish = await createTestDish({ name: `Integration Delivery Dish ${runId}` });
    dishId = dish.id;
  });

  it('rejects checkout without a delivery dorm', async () => {
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        tipAmount: 0,
      });

    expect(res.status).toBe(400);
  });

  it('rejects East dorm without a room number', async () => {
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        tipAmount: 0,
        deliveryDorm: 'East',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/room number/i);
  });

  it('accepts Harvey Hall without a room number', async () => {
    // Use POST /api/orders (no Stripe) — checkout success path needs live/sandbox Stripe.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        deliveryDorm: 'Harvey Hall',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.deliveryLocation).toBe('Harvey Hall');

    await prisma.order.delete({ where: { id: res.body.data.order.id } }).catch(() => {});
  });

  it('formats East with room number', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        deliveryDorm: 'East',
        deliveryRoomNumber: '412',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.deliveryLocation).toBe('East (Room 412)');

    await prisma.order.delete({ where: { id: res.body.data.order.id } }).catch(() => {});
  });
});
