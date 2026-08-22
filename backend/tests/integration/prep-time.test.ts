import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';

describe('Prep time intelligence', () => {
  let chefToken: string;
  let customerToken: string;
  let dishId: string;
  let categoryId: string;
  let chefId: string;
  let customerId: string;
  let queueOrderId: string;

  beforeAll(async () => {
    const chefHash = await bcrypt.hash('PrepChef-123', 10);
    const customerHash = await bcrypt.hash('PrepCustomer-123', 10);

    const chef = await prisma.user.upsert({
      where: { email: 'prep-intel-chef@local.test' },
      create: {
        email: 'prep-intel-chef@local.test',
        name: 'Prep Chef',
        password: chefHash,
        role: 'CHEF',
      },
      update: { password: chefHash, role: 'CHEF' },
    });
    chefId = chef.id;

    const customer = await prisma.user.upsert({
      where: { email: 'prep-intel-customer@local.test' },
      create: {
        email: 'prep-intel-customer@local.test',
        name: 'Prep Customer',
        password: customerHash,
        role: 'CUSTOMER',
      },
      update: { password: customerHash },
    });
    customerId = customer.id;

    const category = await prisma.category.upsert({
      where: { name: 'Prep Intel Category' },
      create: { name: 'Prep Intel Category', displayOrder: 998 },
      update: {},
    });
    categoryId = category.id;

    const dish = await prisma.dish.upsert({
      where: { id: '00000000-0000-4000-8000-prepintel01' },
      create: {
        id: '00000000-0000-4000-8000-prepintel01',
        name: 'Prep Intel Burger',
        description: 'test',
        price: 9.99,
        categoryId,
        status: 'AVAILABLE',
        prepTime: 20,
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
      update: { prepTime: 20, categoryId },
    });
    dishId = dish.id;

    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prep-intel-chef@local.test', password: 'PrepChef-123' });
    chefToken = chefLogin.body.data.token;

    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prep-intel-customer@local.test', password: 'PrepCustomer-123' });
    customerToken = customerLogin.body.data.token;

    const queueOrder = await prisma.order.create({
      data: {
        userId: customerId,
        status: 'PREPARING',
        paymentStatus: 'PAID',
        totalPrice: 9.99,
        tipAmount: 0,
        finalAmount: 9.99,
        prepTime: 30,
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 9.99 }] },
      },
    });
    queueOrderId = queueOrder.id;
  });

  afterAll(async () => {
    await prisma.prepTimeObservation.deleteMany({
      where: { order: { userId: { in: [chefId, customerId] } } },
    });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [chefId, customerId] } } } });
    await prisma.order.deleteMany({ where: { userId: { in: [chefId, customerId] } } });
    await prisma.dish.deleteMany({ where: { id: dishId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [chefId, customerId] } } });
  });

  it('returns prep intelligence for chef', async () => {
    const res = await request(app)
      .get('/api/orders/prep-intelligence')
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);

    expect(res.body.data.queue.preparing).toBeGreaterThanOrEqual(1);
    expect(res.body.data.queue.queueLoadMinutes).toBeGreaterThan(0);
    expect(res.body.data.learning.enabled).toBe(false);
  });

  it('allows chef to override order prep time', async () => {
    const res = await request(app)
      .patch(`/api/orders/${queueOrderId}/prep-time`)
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ prepTimeMinutes: 45 })
      .expect(200);

    expect(res.body.data.order.prepTime).toBe(45);
    expect(res.body.data.order.prepTimeSource).toBe('CHEF_OVERRIDE');

    const customerView = await request(app)
      .get(`/api/orders/${queueOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(customerView.body.data.order.prepTime).toBe(45);
  });

  it('records observation when order completes', async () => {
    const createdAt = new Date(Date.now() - 35 * 60_000);
    const outForDelivery = await prisma.order.create({
      data: {
        userId: customerId,
        status: 'OUT_FOR_DELIVERY',
        paymentStatus: 'PAID',
        totalPrice: 9.99,
        tipAmount: 0,
        finalAmount: 9.99,
        prepTime: 25,
        createdAt,
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 9.99 }] },
      },
    });

    await request(app)
      .patch(`/api/orders/${outForDelivery.id}/status`)
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    let obs = null;
    for (let i = 0; i < 20; i++) {
      obs = await prisma.prepTimeObservation.findUnique({ where: { orderId: outForDelivery.id } });
      if (obs) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(obs).toBeTruthy();
    expect(obs!.projectedPrepMinutes).toBe(25);
    expect(obs!.actualPrepMinutes).toBeGreaterThan(0);
  });
});
