import { afterEach, describe, expect, it } from 'vitest';
import { canExposePasswordResetLink } from '../../src/services/auth.service';

const KEYS = [
  'SHOW_PASSWORD_RESET_LINK',
  'APP_ENV',
  'NODE_ENV',
  'PASSWORD_RESET_SMOKE_SECRET',
] as const;

const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function snapshotEnv() {
  for (const k of KEYS) saved[k] = process.env[k];
}

function restoreEnv() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

describe('canExposePasswordResetLink', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('allows local non-prod without smoke secret when flag is on', () => {
    snapshotEnv();
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    process.env.NODE_ENV = 'test';
    delete process.env.APP_ENV;
    delete process.env.PASSWORD_RESET_SMOKE_SECRET;
    expect(canExposePasswordResetLink()).toBe(true);
  });

  it('requires smoke secret on staging even with matching header when env unset → false', () => {
    snapshotEnv();
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    process.env.APP_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    delete process.env.PASSWORD_RESET_SMOKE_SECRET;
    expect(canExposePasswordResetLink('anything')).toBe(false);
  });

  it('allows staging only with matching smoke secret', () => {
    snapshotEnv();
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    process.env.APP_ENV = 'staging';
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_SMOKE_SECRET = 'correct-secret';
    expect(canExposePasswordResetLink()).toBe(false);
    expect(canExposePasswordResetLink('wrong')).toBe(false);
    expect(canExposePasswordResetLink('correct-secret')).toBe(true);
  });

  it('never exposes in production without APP_ENV=staging', () => {
    snapshotEnv();
    process.env.SHOW_PASSWORD_RESET_LINK = '1';
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_SMOKE_SECRET = 'correct-secret';
    expect(canExposePasswordResetLink('correct-secret')).toBe(false);
  });
});
