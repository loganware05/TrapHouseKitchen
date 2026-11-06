import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';

const findUnique = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    user: {
      findUnique,
    },
  },
}));

describe('authenticate tokenVersion enforcement', () => {
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret';
    process.env.NODE_ENV = 'test';
    findUnique.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  async function invokeAuthenticate(token: string) {
    const { authenticate } = await import('../../src/middleware/auth');
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as any;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    return { req, next };
  }

  it('rejects tokens that omit tokenVersion', async () => {
    findUnique.mockResolvedValue({ tokenVersion: 0 });
    const token = jwt.sign(
      { id: 'user-1', name: 'Casey', role: 'CUSTOMER' },
      'unit-test-jwt-secret',
      { expiresIn: '1h' }
    );
    const { next } = await invokeAuthenticate(token);
    expect(next).toHaveBeenCalled();
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(401);
  });

  it('accepts tokens with matching tokenVersion', async () => {
    findUnique.mockResolvedValue({ tokenVersion: 3 });
    const token = jwt.sign(
      { id: 'user-1', name: 'Casey', role: 'CUSTOMER', tokenVersion: 3 },
      'unit-test-jwt-secret',
      { expiresIn: '1h' }
    );
    const { req, next } = await invokeAuthenticate(token);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.id).toBe('user-1');
  });
});
