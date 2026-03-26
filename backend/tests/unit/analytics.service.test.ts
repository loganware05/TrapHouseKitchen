import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parsePeriodStart, ingestEvents } from '../../src/services/analytics.service';
import { AppError } from '../../src/middleware/errorHandler';

vi.mock('../../src/lib/prisma', () => ({
  default: {
    analyticsEvent: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

import prisma from '../../src/lib/prisma';

describe('parsePeriodStart', () => {
  it('parses 7d as roughly seven days ago', () => {
    const start = parsePeriodStart('7d');
    const diff = Date.now() - start.getTime();
    expect(diff).toBeGreaterThan(6.5 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(7.5 * 24 * 60 * 60 * 1000);
  });

  it('parses 24h', () => {
    const start = parsePeriodStart('24h');
    const diff = Date.now() - start.getTime();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it('rejects invalid period', () => {
    expect(() => parsePeriodStart('invalid')).toThrow(AppError);
  });
});

describe('ingestEvents', () => {
  beforeEach(() => {
    vi.mocked(prisma.analyticsEvent.createMany).mockClear();
  });

  it('throws on empty array', async () => {
    await expect(ingestEvents(undefined, undefined, [])).rejects.toThrow(AppError);
  });

  it('persists events with user and session', async () => {
    await ingestEvents('user-1', 'sess-1', [
      { event: 'view_dish', metadata: { dishId: 'd1' } },
    ]);
    expect(prisma.analyticsEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-1',
          event: 'view_dish',
          sessionId: 'sess-1',
        }),
      ],
    });
  });
});
