import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';

describe('auth.service token signing', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    vi.resetModules();
  });

  it('signCustomerToken embeds id, name, email, and role', async () => {
    const { signCustomerToken } = await import('../../src/services/auth.service');
    const token = signCustomerToken({
      id: 'user-1',
      email: 'c@example.com',
      name: 'Casey',
      role: 'CUSTOMER',
    });
    const decoded = jwt.verify(token, 'unit-test-jwt-secret') as jwt.JwtPayload;
    expect(decoded.id).toBe('user-1');
    expect(decoded.name).toBe('Casey');
    expect(decoded.email).toBe('c@example.com');
    expect(decoded.role).toBe('CUSTOMER');
  });

  it('signGuestToken omits email in payload', async () => {
    const { signGuestToken } = await import('../../src/services/auth.service');
    const token = signGuestToken({
      id: 'guest-1',
      name: 'Guest',
      role: 'CUSTOMER',
    });
    const decoded = jwt.verify(token, 'unit-test-jwt-secret') as jwt.JwtPayload;
    expect(decoded.id).toBe('guest-1');
    expect(decoded.name).toBe('Guest');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.email).toBeUndefined();
  });
});
