import '../mocks/stripeModule';
import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { stripeTestFns } from '../mocks/stripeModule';

describe('Checkout and coupon discount chain', () => {
  const password = 'password-integration-123';

  let token: string;
  let userId: string;
  let dishId: string;
  let categoryId: string;
  let couponId: string;
  let runId: string;
  const dishPrice = 10.99;
  const discount = 4;

  beforeEach(async () => {
    stripeTestFns.paymentIntentsCreate.mockClear();
    runId = randomUUID().slice(0, 8);
    const customerEmail = `integration-co-${runId}@example.com`;
    stripeTestFns.paymentIntentsCreate.mockImplementation(() =>
      Promise.resolve({
        id: `pi_${randomUUID().slice(0, 10)}`,
        status: 'requires_payment_method' as const,
        client_secret: 'cs_test_checkout_secret',
      })
    );
    stripeTestFns.paymentIntentsCancel.mockResolvedValue({});

    const category = await prisma.category.create({
      data: {
        name: `Integration Checkout ${runId}`,
        description: 'it',
        displayOrder: 1,
      },
    });
    categoryId = category.id;

    const dish = await prisma.dish.create({
      data: {
        name: `Integration Dish ${runId}`,
        description: 'burger',
        price: dishPrice,
        categoryId,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });
    dishId = dish.id;

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: customerEmail,
        name: 'Integration Customer',
        password: hashed,
        role: 'CUSTOMER',
      },
    });
    userId = user.id;

    const coupon = await prisma.coupon.create({
      data: {
        code: `SAVE${runId.slice(0, 6)}`.toUpperCase(),
        userId,
        discountAmount: discount,
        used: false,
      },
    });
    couponId = coupon.id;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: customerEmail, password });
    token = login.body.data.token;
  });

  it('POST /orders/checkout passes discounted amount to Stripe when couponCode is sent', async () => {
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ dishId, quantity: 1 }],
        tipAmount: 0,
        couponCode: (await prisma.coupon.findUnique({ where: { id: couponId } }))!.code,
      })
      .expect(201);

    const expectedTotal = Math.max(0, dishPrice - discount);
    expect(res.body.data.amount).toBeCloseTo(expectedTotal, 5);
    expect(stripeTestFns.paymentIntentsCreate).toHaveBeenCalled();
    const piArgs = stripeTestFns.paymentIntentsCreate.mock.calls[0][0] as { amount: number };
    expect(piArgs.amount).toBe(Math.round(expectedTotal * 100));
  });

  it('POST /coupons/apply then /payment/create-payment-intent uses order.appliedCouponId without couponCode', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ dishId, quantity: 1 }] })
      .expect(201);
    const orderId = orderRes.body.data.order.id;

    const code = (await prisma.coupon.findUnique({ where: { id: couponId } }))!.code;
    await request(app)
      .post('/api/coupons/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({ code, orderId })
      .expect(200);

    await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, tipAmount: 0 })
      .expect(200);

    const expectedTotal = Math.max(0, dishPrice - discount);
    const piArgs = stripeTestFns.paymentIntentsCreate.mock.calls[0][0] as { amount: number };
    expect(piArgs.amount).toBe(Math.round(expectedTotal * 100));
  });

  it('rejects PaymentIntent when couponCode does not match order.appliedCouponId', async () => {
    await prisma.coupon.create({
      data: {
        code: `OTHER${runId.slice(0, 4)}`.toUpperCase(),
        userId,
        discountAmount: 2,
        used: false,
      },
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ dishId, quantity: 1 }] })
      .expect(201);
    const orderId = orderRes.body.data.order.id;

    const appliedCode = (await prisma.coupon.findUnique({ where: { id: couponId } }))!.code;
    await request(app)
      .post('/api/coupons/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: appliedCode, orderId })
      .expect(200);

    const other = await prisma.coupon.findFirst({
      where: { userId, code: { not: appliedCode } },
    });

    const payRes = await request(app)
      .post('/api/payment/create-payment-intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, tipAmount: 0, couponCode: other!.code });

    expect(payRes.status).toBe(400);
    expect(payRes.body.message).toMatch(/does not match/i);
  });
});
