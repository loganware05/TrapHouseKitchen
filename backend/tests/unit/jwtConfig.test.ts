import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('jwtConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows insecure default outside production when JWT_SECRET is missing', async () => {
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getJwtSecret } = await import('../../src/lib/jwtConfig');
    expect(getJwtSecret()).toBe('default-secret');
    warn.mockRestore();
  });

  it('fails closed in production when JWT_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    const { getJwtSecret } = await import('../../src/lib/jwtConfig');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET must be set/);
  });

  it('fails closed in production when JWT_SECRET is the known default', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'default-secret';
    const { getJwtSecret } = await import('../../src/lib/jwtConfig');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET must be set/);
  });

  it('returns configured secret in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'prod-strong-secret-value';
    const { getJwtSecret } = await import('../../src/lib/jwtConfig');
    expect(getJwtSecret()).toBe('prod-strong-secret-value');
  });
});
