import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import {
  REVIEW_APPROVE_GATEWAY,
  ensureDefaultGateways,
  updateCouponAwardGateway,
} from '../../src/services/couponGateway.service';
import { resolveCouponForCheckout } from '../../src/services/payment.service';

describe('Coupon gateways + checkout discount', () => {
  let chefToken: string;
  let customerToken: string;
  let customerId: string;
  let chefId: string;
  let dishId: string;
  let categoryId: string;
  let pendingReviewId: string;
  const runId = randomUUID().slice(0, 8);

  beforeAll(async () => {
    await ensureDefaultGateways();
    await updateCouponAwardGateway({
      key: REVIEW_APPROVE_GATEWAY,
      enabled: true,
      discountAmount: 4,
    });

    const chefHash = await bcrypt.hash('CouponChef-123', 10);
    const customerHash = await bcrypt.hash('CouponCust-123', 10);

    const chef = await prisma.user.upsert({
      where: { email: `coupon-gw-chef-${runId}@local.test` },
      create: {
        email: `coupon-gw-chef-${runId}@local.test`,
        name: 'Coupon Chef',
        password: chefHash,
        role: 'CHEF',
      },
      update: { password: chefHash, role: 'CHEF' },
    });
    chefId = chef.id;

    const customer = await prisma.user.upsert({
      where: { email: `coupon-gw-cust-${runId}@local.test` },
      create: {
        email: `coupon-gw-cust-${runId}@local.test`,
        name: 'Coupon Customer',
        password: customerHash,
        role: 'CUSTOMER',
      },
      update: { password: customerHash },
    });
    customerId = customer.id;

    const category = await prisma.category.create({
      data: { name: `Coupon GW Cat ${runId}`, displayOrder: 997 },
    });
    categoryId = category.id;

    const dish = await prisma.dish.create({
      data: {
        name: `Coupon GW Dish ${runId}`,
        description: 'test',
        price: 12,
        categoryId,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });
    dishId = dish.id;

    const completed = await prisma.order.create({
      data: {
        userId: customerId,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        totalPrice: 12,
        tipAmount: 0,
        finalAmount: 12,
        completedAt: new Date(),
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 12 }] },
      },
    });

    const review = await prisma.review.create({
      data: {
        userId: customerId,
        orderId: completed.id,
        dishId,
        rating: 5,
        comment: 'Great for coupon gateway test',
        dishName: `Coupon GW Dish ${runId}`,
        approved: false,
      },
    });
    pendingReviewId = review.id;

    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `coupon-gw-chef-${runId}@local.test`, password: 'CouponChef-123' });
    chefToken = chefLogin.body.data.token;

    const custLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `coupon-gw-cust-${runId}@local.test`, password: 'CouponCust-123' });
    customerToken = custLogin.body.data.token;
  });

  afterAll(async () => {
    await updateCouponAwardGateway({
      key: REVIEW_APPROVE_GATEWAY,
      enabled: true,
      discountAmount: 4,
    });
    await prisma.review.deleteMany({ where: { userId: customerId } });
    await prisma.coupon.deleteMany({ where: { userId: customerId } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: customerId } } });
    await prisma.order.deleteMany({ where: { userId: customerId } });
    await prisma.dish.deleteMany({ where: { id: dishId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.user.deleteMany({ where: { id: { in: [chefId, customerId] } } });
  });

  it('lists and updates gateways for chef', async () => {
    const list = await request(app)
      .get('/api/coupons/gateways')
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);

    expect(list.body.data.gateways.some((g: any) => g.key === 'REVIEW_APPROVE')).toBe(true);

    const patched = await request(app)
      .patch('/api/coupons/gateways/REVIEW_APPROVE')
      .set('Authorization', `Bearer ${chefToken}`)
      .send({ discountAmount: 5.5, enabled: true })
      .expect(200);

    expect(patched.body.data.gateway.discountAmount).toBe(5.5);
  });

  it('mints coupon on approve when gateway enabled', async () => {
    await updateCouponAwardGateway({
      key: REVIEW_APPROVE_GATEWAY,
      enabled: true,
      discountAmount: 5.5,
    });

    const res = await request(app)
      .post(`/api/reviews/${pendingReviewId}/approve`)
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);

    expect(res.body.data.coupon).toBeTruthy();
    expect(res.body.data.coupon.discountAmount).toBe(5.5);
    expect(res.body.data.gatewayEnabled).toBe(true);

    const coupon = await prisma.coupon.findUnique({
      where: { code: res.body.data.coupon.code },
    });
    expect(coupon?.userId).toBe(customerId);
    expect(coupon?.sourceReviewId).toBe(pendingReviewId);
  });

  it('management list includes award coupon for approved review', async () => {
    const res = await request(app)
      .get('/api/reviews/management')
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);

    const row = res.body.data.reviews.find((r: { id: string }) => r.id === pendingReviewId);
    expect(row?.awardCoupon).toBeTruthy();
    expect(row.awardCoupon.code).toMatch(/^TRAP-/);
    expect(row.awardCoupon.discountAmount).toBe(5.5);
  });

  it('does not mint when gateway disabled', async () => {
    const order = await prisma.order.create({
      data: {
        userId: customerId,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        totalPrice: 12,
        tipAmount: 0,
        finalAmount: 12,
        completedAt: new Date(),
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 12 }] },
      },
    });
    const review = await prisma.review.create({
      data: {
        userId: customerId,
        orderId: order.id,
        dishId,
        rating: 4,
        comment: 'No coupon expected',
        dishName: `Coupon GW Dish ${runId}`,
        approved: false,
      },
    });

    const before = await prisma.coupon.count({ where: { userId: customerId } });

    // Disable immediately before approve so parallel suites cannot re-enable in between.
    await updateCouponAwardGateway({
      key: REVIEW_APPROVE_GATEWAY,
      enabled: false,
      discountAmount: 4,
    });

    const res = await request(app)
      .post(`/api/reviews/${review.id}/approve`)
      .set('Authorization', `Bearer ${chefToken}`)
      .expect(200);

    expect(res.body.data.coupon).toBeUndefined();
    expect(res.body.data.gatewayEnabled).toBe(false);
    const after = await prisma.coupon.count({ where: { userId: customerId } });
    expect(after).toBe(before);

    await updateCouponAwardGateway({
      key: REVIEW_APPROVE_GATEWAY,
      enabled: true,
      discountAmount: 4,
    });
  });

  it('reserves coupon against concurrent open checkouts', async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `RSV${runId}`.toUpperCase().slice(0, 12),
        userId: customerId,
        discountAmount: 2,
        used: false,
      },
    });

    const holder = await prisma.order.create({
      data: {
        userId: customerId,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        totalPrice: 12,
        tipAmount: 0,
        finalAmount: 10,
        appliedCouponId: coupon.id,
        items: { create: [{ dishId, quantity: 1, priceAtOrder: 12 }] },
      },
    });

    await expect(
      resolveCouponForCheckout(customerId, coupon.code, { excludeOrderId: 'other-order' })
    ).rejects.toMatchObject({ statusCode: 400 });

    const ok = await resolveCouponForCheckout(customerId, coupon.code, {
      excludeOrderId: holder.id,
    });
    expect(ok?.id).toBe(coupon.id);
  });

  it('rejects validating an already-used coupon', async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `USED${runId}`.toUpperCase().slice(0, 12),
        userId: customerId,
        discountAmount: 3,
        used: true,
        usedOrderId: '00000000-0000-4000-8000-000000000001',
      },
    });

    await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: coupon.code })
      .expect(400);
  });
});
