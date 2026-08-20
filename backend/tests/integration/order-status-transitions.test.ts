import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { createTestDish, createTestUser, testEmail } from '../factories';

async function advance(
  orderId: string,
  token: string,
  status: string
) {
  return request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });
}

describe('Order status transitions (OUT_FOR_DELIVERY)', () => {
  const runId = randomUUID().slice(0, 8);
  let chefToken: string;
  let orderId: string;

  beforeAll(async () => {
    const password = 'test-password-123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const chef = await createTestUser({
      email: testEmail(`integration-status-chef-${runId}`),
      password: hashedPassword,
      role: 'CHEF',
    });
    const customer = await createTestUser({
      email: testEmail(`integration-status-cust-${runId}`),
      password: hashedPassword,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: chef.email, password });
    chefToken = login.body.data.token;

    const dish = await createTestDish({ name: `Status Transition Dish ${runId}` });

    const order = await prisma.order.create({
      data: {
        userId: customer.id,
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

  it('rejects skipping from PENDING to COMPLETED', async () => {
    const res = await advance(orderId, chefToken, 'COMPLETED');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid status transition/i);
  });

  it('walks PENDING → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED', async () => {
    for (const status of ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'] as const) {
      const res = await advance(orderId, chefToken, status);
      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe(status);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, completedAt: true },
    });
    expect(order?.status).toBe('COMPLETED');
    expect(order?.completedAt).not.toBeNull();
  });
});
