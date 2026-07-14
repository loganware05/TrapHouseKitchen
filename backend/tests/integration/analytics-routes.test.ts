import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';

describe('GET /api/analytics/dashboard', () => {
  let chefToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const suffix = randomUUID().slice(0, 8);
    const hashed = await bcrypt.hash('chefAn123', 10);
    const chefEmail = `integration-analytics-chef-${suffix}@example.com`;
    await prisma.user.create({
      data: {
        email: chefEmail,
        name: 'Analytics Chef',
        password: hashed,
        role: 'CHEF',
      },
    });
    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'chefAn123' })
      .expect(200);
    chefToken = chefLogin.body.data.token;

    const custReg = await request(app)
      .post('/api/auth/register')
      .send({
        email: `integration-analytics-cust-${suffix}@example.com`,
        password: 'custAn123',
        name: 'Analytics Customer',
      })
      .expect(201);
    customerToken = custReg.body.data.token;
  });

  it('returns 200 with summary fields for chef', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${chefToken}`)
      .query({ period: '14d' })
      .expect(200);

    expect(res.body.status).toBe('success');
    const data = res.body.data;
    expect(data.period).toBe('14d');
    expect(data).toHaveProperty('revenue');
    expect(data).toHaveProperty('orderCount');
    expect(data).toHaveProperty('funnel');
    expect(data).toHaveProperty('topDishes');
    expect(typeof data.periodStart).toBe('string');
  });

  it('returns 403 for customer', async () => {
    await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });
});

describe('GET /api/analytics/dashboard period validation', () => {
  it('returns 400 for invalid period token', async () => {
    const suffix = randomUUID().slice(0, 8);
    const hashed = await bcrypt.hash('chefAn456', 10);
    const chefEmail = `integration-analytics-bad-${suffix}@example.com`;
    await prisma.user.create({
      data: {
        email: chefEmail,
        name: 'Bad Period Chef',
        password: hashed,
        role: 'CHEF',
      },
    });
    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'chefAn456' })
      .expect(200);

    await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${chefLogin.body.data.token}`)
      .query({ period: 'not-a-period' })
      .expect(400);
  });
});
