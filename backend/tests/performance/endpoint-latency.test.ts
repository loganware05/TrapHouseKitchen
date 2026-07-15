/**
 * Lightweight load / latency smoke tests for high-value endpoints.
 * Not a full k6 suite — catches obvious regressions in CI without external tools.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { createTestDish } from '../factories';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

describe('Endpoint latency / load smoke', () => {
  const runId = randomUUID().slice(0, 8);
  let chefToken: string;
  let customerToken: string;
  let chefUserId: string;
  let custUserId: string;
  const seededDishIds: string[] = [];
  const seededCategoryIds: string[] = [];

  afterAll(async () => {
    try {
      await prisma.aiInteraction.deleteMany({ where: { userId: custUserId } });
      await prisma.dish.deleteMany({
        where: { id: { in: seededDishIds } },
      });
      const uniqueCats = [...new Set(seededCategoryIds)];
      if (uniqueCats.length) {
        await prisma.category.deleteMany({ where: { id: { in: uniqueCats } } });
      }
      await prisma.user.deleteMany({
        where: {
          id: { in: [chefUserId, custUserId].filter(Boolean) },
        },
      });
    } catch {
      /* ignore */
    }
  });

  beforeAll(async () => {
    for (let i = 0; i < 6; i++) {
      const d = await createTestDish({ price: 4 + i * 0.5 });
      seededDishIds.push(d.id);
      seededCategoryIds.push(d.categoryId);
    }

    const chefEmail = `integration-perf-chef-${runId}@example.com`;
    const custEmail = `integration-perf-cust-${runId}@example.com`;

    const chef = await prisma.user.create({
      data: {
        email: chefEmail,
        name: 'Test Chef Perf',
        password: await bcrypt.hash('perfChefPass12', 10),
        role: 'CHEF',
      },
    });
    chefUserId = chef.id;
    const cust = await prisma.user.create({
      data: {
        email: custEmail,
        name: 'Test Customer Perf',
        password: await bcrypt.hash('perfCustPass12', 10),
        role: 'CUSTOMER',
      },
    });
    custUserId = cust.id;

    const chefLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: chefEmail, password: 'perfChefPass12' })
      .expect(200);
    chefToken = chefLogin.body.data.token;

    const custLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: custEmail, password: 'perfCustPass12' })
      .expect(200);
    customerToken = custLogin.body.data.token;
  });

  it('GET menu endpoint tolerates concurrent requests (p95 under threshold)', async () => {
    const rounds = 4;
    const concurrency = 8;
    const latencies: number[] = [];

    for (let r = 0; r < rounds; r++) {
      const batchStart = Date.now();
      const promises = Array.from({ length: concurrency }, async () => {
        const t0 = Date.now();
        await request(app).get('/api/dishes').expect(200);
        return Date.now() - t0;
      });
      const times = await Promise.all(promises);
      latencies.push(...times);
      const wall = Date.now() - batchStart;
      // Wall-clock sanity: batch should not serialize excessively
      expect(wall).toBeLessThan(60_000);
    }

    latencies.sort((a, b) => a - b);
    const p95 = percentile(latencies, 95);
    expect(p95).toBeLessThan(15_000);
  });

  it('GET /api/analytics/dashboard tolerates repeated chef requests', async () => {
    const latencies: number[] = [];
    const n = 12;

    for (let i = 0; i < n; i++) {
      const t0 = Date.now();
      await request(app)
        .get('/api/analytics/dashboard?period=7d')
        .set('Authorization', `Bearer ${chefToken}`)
        .expect(200);
      latencies.push(Date.now() - t0);
    }

    latencies.sort((a, b) => a - b);
    const p95 = percentile(latencies, 95);
    expect(p95).toBeLessThan(20_000);
  });

  it('POST /api/ai/build-meal completes within a generous budget (greedy or LLM)', async () => {
    const t0 = Date.now();
    const res = await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ budget: 12 })
      .expect(200);
    const ms = Date.now() - t0;

    expect(res.body.data.combinations).toBeDefined();
    expect(Array.isArray(res.body.data.combinations)).toBe(true);
    // Allow slow CI or real LLM calls; fail only on hangs / timeouts
    expect(ms).toBeLessThan(120_000);
  });
});
