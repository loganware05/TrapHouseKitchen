import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';

describe('Coupon routes', () => {
  let token: string;
  let userId: string;
  let orderId: string;
  let couponCode: string;
  let dishId: string;
  let categoryId: string;
  const runId = randomUUID().slice(0, 8);

  async function setup() {
    const email = `integration-cp-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const hashed = await bcrypt.hash('pw12345', 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Coupon User',
        password: hashed,
        role: 'CUSTOMER',
      },
    });
    userId = user.id;

    const uniq = randomUUID().slice(0, 10);
    const category = await prisma.category.create({
      data: {
        name: `Integration CP Cat ${uniq}`,
        description: 'c',
        displayOrder: 1,
      },
    });
    categoryId = category.id;

    const dish = await prisma.dish.create({
      data: {
        name: `Integration CP Dish ${uniq}`,
        description: 'd',
        price: 15,
        categoryId,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });
    dishId = dish.id;

    const coupon = await prisma.coupon.create({
      data: {
        code: `CPN${randomUUID().slice(0, 6)}`.toUpperCase(),
        userId,
        discountAmount: 3.5,
        used: false,
      },
    });
    couponCode = coupon.code;

    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        totalPrice: 15,
        tipAmount: 0,
        finalAmount: 15,
        items: {
          create: [{ dishId, quantity: 1, priceAtOrder: 15 }],
        },
      },
    });
    orderId = order.id;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'pw12345' })
      .expect(200);
    token = login.body.data.token;
  }

  it('POST /validate returns coupon for owner', async () => {
    await setup();
    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: couponCode })
      .expect(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.discountAmount).toBe(3.5);
  });

  it('POST /validate rejects expired coupon', async () => {
    await setup();
    await prisma.coupon.updateMany({
      where: { code: couponCode },
      data: { expiresAt: new Date(Date.now() - 86_400_000) },
    });

    const res = await request(app)
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: couponCode });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('POST /apply updates order and blocks double apply', async () => {
    await setup();
    await request(app)
      .post('/api/coupons/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: couponCode, orderId })
      .expect(200);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.appliedCouponId).toBeTruthy();
    expect(order?.finalAmount).toBeCloseTo(11.5, 5);

    const again = await request(app)
      .post('/api/coupons/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: couponCode, orderId });
    expect(again.status).toBe(400);
    expect(again.body.message).toMatch(/already been applied/i);
  });

  it('concurrent POST /apply: only one wins on same order', async () => {
    await setup();

    const other = await prisma.coupon.create({
      data: {
        code: `CPN2${randomUUID().slice(0, 5)}`.toUpperCase(),
        userId,
        discountAmount: 1,
        used: false,
      },
    });

    const [a, b] = await Promise.all([
      request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: couponCode, orderId }),
      request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: other.code, orderId }),
    ]);

    const ok = [a, b].filter((r) => r.status === 200);
    const fail = [a, b].filter((r) => r.status === 400);
    expect(ok.length).toBe(1);
    expect(fail.length).toBe(1);
    expect(fail[0].body.message).toMatch(/already been applied/i);
  });

  it('GET /my returns only the authenticated user coupons (saved + used)', async () => {
    await setup();
    const used = await prisma.coupon.create({
      data: {
        code: `USED${randomUUID().slice(0, 5)}`.toUpperCase(),
        userId,
        discountAmount: 2,
        used: true,
      },
    });

    const otherEmail = `integration-cp-other-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const otherHash = await bcrypt.hash('pw12345', 10);
    const otherUser = await prisma.user.create({
      data: {
        email: otherEmail,
        name: 'Other Coupon User',
        password: otherHash,
        role: 'CUSTOMER',
      },
    });
    const otherCoupon = await prisma.coupon.create({
      data: {
        code: `OTHR${randomUUID().slice(0, 5)}`.toUpperCase(),
        userId: otherUser.id,
        discountAmount: 9,
        used: false,
      },
    });
    const otherUsed = await prisma.coupon.create({
      data: {
        code: `OTHU${randomUUID().slice(0, 5)}`.toUpperCase(),
        userId: otherUser.id,
        discountAmount: 1,
        used: true,
      },
    });

    const mine = await request(app)
      .get('/api/coupons/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mine.headers['cache-control']).toMatch(/no-store/i);
    const savedCodes = (mine.body.data.coupons as { code: string }[]).map((c) => c.code);
    const usedCodes = (mine.body.data.usedCoupons as { code: string }[]).map((c) => c.code);
    expect(savedCodes).toContain(couponCode);
    expect(usedCodes).toContain(used.code);
    expect(savedCodes).not.toContain(otherCoupon.code);
    expect(usedCodes).not.toContain(otherUsed.code);

    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: otherEmail, password: 'pw12345' })
      .expect(200);

    const theirs = await request(app)
      .get('/api/coupons/my')
      .set('Authorization', `Bearer ${otherLogin.body.data.token}`)
      .expect(200);

    const theirSaved = (theirs.body.data.coupons as { code: string }[]).map((c) => c.code);
    const theirUsed = (theirs.body.data.usedCoupons as { code: string }[]).map((c) => c.code);
    expect(theirSaved).toContain(otherCoupon.code);
    expect(theirUsed).toContain(otherUsed.code);
    expect(theirSaved).not.toContain(couponCode);
    expect(theirUsed).not.toContain(used.code);
  });
});
