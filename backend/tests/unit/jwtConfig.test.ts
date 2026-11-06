import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ENV_KEYS = ['JWT_SECRET', 'NODE_ENV'] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
    (typeof ENV_KEYS)[number],
    string | undefined
  >;
}

function restoreEnv(snapshot: ReturnType<typeof snapshotEnv>) {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('jwtConfig', () => {
  let envSnapshot: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    vi.resetModules();
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
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
