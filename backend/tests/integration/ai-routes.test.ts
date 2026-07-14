import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';

vi.mock('../../src/services/ai.service', () => ({
  buildBudgetMeal: vi.fn(),
  recordComboSelection: vi.fn(),
}));

import app from '../../src/app';
import * as aiService from '../../src/services/ai.service';
import { AppError } from '../../src/middleware/errorHandler';

describe('POST /api/ai/build-meal', () => {
  const runId = randomUUID().slice(0, 8);

  beforeEach(() => {
    vi.mocked(aiService.buildBudgetMeal).mockReset();
  });

  async function customerToken(): Promise<string> {
    const email = `integration-ai-${runId}-${randomUUID().slice(0, 6)}@example.com`;
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'secret1234', name: 'AI Customer' })
      .expect(201);
    return reg.body.data.token as string;
  }

  it('returns mocked combinations and interactionId on success', async () => {
    const token = await customerToken();
    const interactionId = randomUUID();
    vi.mocked(aiService.buildBudgetMeal).mockResolvedValue({
      combinations: [
        {
          name: 'Combo A',
          description: 'Test combo',
          totalPrice: 12,
          items: [
            {
              dishId: randomUUID(),
              name: 'Fixture Plate',
              price: 6,
              quantity: 2,
              dish: {} as never,
            },
          ],
        },
      ],
      interactionId,
    });

    const res = await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({ budget: 20 })
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.interactionId).toBe(interactionId);
    const combos = res.body.data.combinations as Array<{
      items: Array<{ dishId: string; name: string; price: number }>;
    }>;
    expect(combos.length).toBeGreaterThan(0);
    const first = combos[0].items[0];
    expect(first).toMatchObject({
      dishId: expect.any(String),
      name: expect.any(String),
      price: expect.any(Number),
    });
    expect(aiService.buildBudgetMeal).toHaveBeenCalledWith(expect.any(String), 20);
  });

  it('rejects missing budget with 400', async () => {
    const token = await customerToken();
    const res = await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
    expect(res.body.message).toBeTruthy();
  });

  it('rejects budget below minimum', async () => {
    const token = await customerToken();
    await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({ budget: 4 })
      .expect(400);
  });

  it('rejects budget above maximum', async () => {
    const token = await customerToken();
    await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({ budget: 101 })
      .expect(400);
  });

  it('propagates service failures as HTTP errors (e.g. 503)', async () => {
    const token = await customerToken();
    vi.mocked(aiService.buildBudgetMeal).mockRejectedValue(
      new AppError('The meal builder is temporarily unavailable. Please try again.', 503)
    );

    await request(app)
      .post('/api/ai/build-meal')
      .set('Authorization', `Bearer ${token}`)
      .send({ budget: 15 })
      .expect(503);
  });
});
