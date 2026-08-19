import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import {
  cancelAbandonedUnpaidOrders,
  getChefOrders,
  getCustomerOrdersWithItemReviews,
} from '../../src/services/order.service';
import {
  createTestDish,
  createTestOrder,
  createTestPayment,
  createTestUser,
  testEmail,
} from '../factories';

describe('Unpaid order visibility and cleanup', () => {
  const runId = randomUUID().slice(0, 8);
  let customerToken: string;
  let chefToken: string;
  let customerId: string;
  let dishId: string;

  beforeAll(async () => {
    const password = 'test-password-123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await createTestUser({
      email: testEmail(`integration-customer-${runId}`),
      password: hashedPassword,
    });
    customerId = customer.id;

    const chef = await createTestUser({
      email: testEmail(`integration-chef-${runId}`),
      password: hashedPassword,
      role: 'CHEF',
    });

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: customer.email, password });
    customerToken = customerLogin.body.data.token;

    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chef.email, password });
    chefToken = chefLogin.body.data.token;

    const dish = await createTestDish({ name: `Integration Dish ${runId}` });
    dishId = dish.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { order: { userId: customerId } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: customerId } },
    });
    await prisma.order.deleteMany({ where: { userId: customerId } });
    await prisma.dish.deleteMany({ where: { id: dishId } });
  });

  async function createOrderForCustomer(paymentStatus: PaymentStatus) {
    return createTestOrder({
      userId: customerId,
      paymentStatus,
      items: [{ dishId, quantity: 1, priceAtOrder: 9.99 }],
    });
  }

  it('customer order list excludes UNPAID, PENDING, and FAILED orders', async () => {
    const paid = await createOrderForCustomer(PaymentStatus.PAID);
    const unpaid = await createOrderForCustomer(PaymentStatus.UNPAID);
    const pending = await createOrderForCustomer(PaymentStatus.PENDING);
    const failed = await createOrderForCustomer(PaymentStatus.FAILED);

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.orders.map((o: { id: string }) => o.id);
    expect(ids).toContain(paid.id);
    expect(ids).not.toContain(unpaid.id);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(failed.id);
  });

  it('chef order list excludes UNPAID, PENDING, and FAILED orders', async () => {
    const paid = await createOrderForCustomer(PaymentStatus.PAID);
    const unpaid = await createOrderForCustomer(PaymentStatus.UNPAID);
    const pending = await createOrderForCustomer(PaymentStatus.PENDING);
    const failed = await createOrderForCustomer(PaymentStatus.FAILED);

    const res = await request(app)
      .get('/api/orders/all')
      .set('Authorization', `Bearer ${chefToken}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.orders.map((o: { id: string }) => o.id);
    expect(ids).toContain(paid.id);
    expect(ids).not.toContain(unpaid.id);
    expect(ids).not.toContain(pending.id);
    expect(ids).not.toContain(failed.id);
  });

  it('customer can still fetch a single UNPAID order by id during checkout', async () => {
    const unpaid = await createOrderForCustomer(PaymentStatus.UNPAID);

    const res = await request(app)
      .get(`/api/orders/${unpaid.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.id).toBe(unpaid.id);
    expect(res.body.data.order.paymentStatus).toBe('UNPAID');
  });

  it('payment_intent.canceled webhook cancels an unpaid order', async () => {
    const unpaid = await createOrderForCustomer(PaymentStatus.PENDING);
    const stripePaymentIntentId = `pi_test_cancel_${runId}`;
    await createTestPayment(unpaid.id, {
      stripePaymentIntentId,
      status: 'PENDING',
    });

    const payload = JSON.stringify({
      id: `evt_cancel_${runId}`,
      type: 'payment_intent.canceled',
      data: { object: { id: stripePaymentIntentId } },
    });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: unpaid.id } });
    expect(order.status).toBe('CANCELLED');
  });

  it('cancelAbandonedUnpaidOrders cancels old UNPAID and PENDING orders', async () => {
    const recentUnpaid = await createOrderForCustomer(PaymentStatus.UNPAID);
    const oldUnpaid = await createOrderForCustomer(PaymentStatus.UNPAID);
    const oldPending = await createOrderForCustomer(PaymentStatus.PENDING);

    const staleCreatedAt = new Date(Date.now() - 31 * 60 * 1000);
    await prisma.order.updateMany({
      where: { id: { in: [oldUnpaid.id, oldPending.id] } },
      data: { createdAt: staleCreatedAt },
    });

    const result = await cancelAbandonedUnpaidOrders();
    expect(result.count).toBeGreaterThanOrEqual(2);

    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: recentUnpaid.id } });
    const cancelledUnpaid = await prisma.order.findUniqueOrThrow({
      where: { id: oldUnpaid.id },
    });
    const cancelledPending = await prisma.order.findUniqueOrThrow({
      where: { id: oldPending.id },
    });

    expect(fresh.status).not.toBe('CANCELLED');
    expect(cancelledUnpaid.status).toBe('CANCELLED');
    expect(cancelledPending.status).toBe('CANCELLED');
  });

  it('service helpers align with list API filters', async () => {
    await createOrderForCustomer(PaymentStatus.PAID);
    await createOrderForCustomer(PaymentStatus.UNPAID);

    const customerOrders = await getCustomerOrdersWithItemReviews(customerId);
    const chefOrders = await getChefOrders({ includeArchived: false });

    expect(customerOrders.every((o) => o.paymentStatus !== 'UNPAID')).toBe(true);
    expect(chefOrders.every((o) => o.paymentStatus !== 'UNPAID')).toBe(true);
  });
});
