import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import { KITCHEN_OPS_ID } from '../../src/services/kitchenOps.service';

describe('Kitchen ops + checkout gate', () => {
  const runId = randomUUID().slice(0, 8);
  let chefToken = '';
  let customerToken = '';
  let dishId = '';

  beforeAll(async () => {
    await prisma.kitchenOps.upsert({
      where: { id: KITCHEN_OPS_ID },
      create: { id: KITCHEN_OPS_ID, acceptingOrders: true, scheduleEnabled: false },
      update: {
        acceptingOrders: true,
        scheduleEnabled: false,
        weeklyHours: null,
        maxConcurrentKitchenOrders: null,
      },
    });

    const chefEmail = `integration-kitchen-chef-${runId}@example.com`;
    const chefReg = await request(app)
      .post('/api/auth/register')
      .send({ email: chefEmail, password: 'secret1234', name: 'Kitchen Chef' })
      .expect(201);
    await prisma.user.update({
      where: { id: chefReg.body.data.user.id },
      data: { role: 'CHEF' },
    });
    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'secret1234' })
      .expect(200);
    chefToken = chefLogin.body.data.token;

    const customerEmail = `integration-kitchen-cust-${runId}@example.com`;
    const custReg = await request(app)
      .post('/api/auth/register')
      .send({ email: customerEmail, password: 'secret1234', name: 'Kitchen Cust' })
      .expect(201);
    customerToken = custReg.body.data.token;

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: `Kitchen Cat ${runId}`, displayOrder: 0 },
      });
    }
    const dish = await prisma.dish.create({
      data: {
        name: `Kitchen Dish ${runId}`,
        description: 'test',
        price: 10,
        categoryId: category.id,
        status: 'AVAILABLE',
        remainingServings: 2,
      },
    });
    dishId = dish.id;
  });

  it('GET /api/kitchen/status is public', async () => {
    const res = await request(app).get('/api/kitchen/status').expect(200);
    expect(res.body.data.openNow).toBe(true);
    expect(res.body.data.timezone).toBe('America/Chicago');
  });

  it('customer cannot PATCH /api/kitchen/ops', async () => {
    await request(app)
      .patch('/api/kitchen/ops')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ acceptingOrders: false })
      .expect(403);
  });

  it('chef pause rejects checkout with 403', async () => {
    await request(app)
      .patch('/api/kitchen/ops')
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ acceptingOrders: false })
      .expect(200);

    const status = await request(app).get('/api/kitchen/status').expect(200);
    expect(status.body.data.openNow).toBe(false);
    expect(status.body.data.reason).toBe('paused');

    await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        deliveryDorm: 'Harvey Hall',
        tipAmount: 0,
      })
      .expect(403);

    await request(app)
      .patch('/api/kitchen/ops')
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ acceptingOrders: true })
      .expect(200);
  });

  it('rejects order when quantity exceeds remainingServings', async () => {
    await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ dishId, quantity: 5 }],
        deliveryDorm: 'Harvey Hall',
        tipAmount: 0,
      })
      .expect(400);
  });

  it('rejects PaymentIntent create when remaining servings are exhausted after unpaid draft', async () => {
    await prisma.dish.update({
      where: { id: dishId },
      data: { remainingServings: 1, status: 'AVAILABLE' },
    });

    const order = await prisma.order.create({
      data: {
        userId: (
          await prisma.user.findFirstOrThrow({
            where: { email: { contains: `integration-kitchen-cust-${runId}` } },
          })
        ).id,
        totalPrice: 10,
        finalAmount: 10,
        tipAmount: 0,
        deliveryLocation: 'Harvey Hall',
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 10 }] },
      },
    });

    await prisma.dish.update({
      where: { id: dishId },
      data: { remainingServings: 0, status: 'UNAVAILABLE' },
    });

    await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: order.id, tipAmount: 0 })
      .expect(400);
  });
});
