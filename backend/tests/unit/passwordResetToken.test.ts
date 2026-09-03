import { describe, it, expect } from 'vitest';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  readCapturedPasswordResetToken,
  capturePasswordResetTokenForE2e,
} from '../../src/lib/passwordResetToken';
import fs from 'fs';
import path from 'path';

describe('passwordResetToken', () => {
  it('hashPasswordResetToken is deterministic and not reversible to raw token', () => {
    const raw = 'abc123token';
    const h1 = hashPasswordResetToken(raw);
    const h2 = hashPasswordResetToken(raw);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(raw);
    expect(h1).toHaveLength(64);
  });

  it('generatePasswordResetToken returns unique hex strings', () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('capturePasswordResetTokenForE2e writes file when env flag set', () => {
    const prev = process.env.E2E_CAPTURE_PASSWORD_RESET;
    process.env.E2E_CAPTURE_PASSWORD_RESET = '1';
    const email = `capture-test-${Date.now()}@example.com`;
    const raw = generatePasswordResetToken();

    try {
      capturePasswordResetTokenForE2e(email, raw);
      expect(readCapturedPasswordResetToken(email)).toBe(raw);
    } finally {
      const safeName = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
      const filePath = path.join(
        process.cwd(),
        '.agent',
        'e2e-capture',
        'password-reset',
        `${safeName}.token`
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (prev === undefined) {
        delete process.env.E2E_CAPTURE_PASSWORD_RESET;
      } else {
        process.env.E2E_CAPTURE_PASSWORD_RESET = prev;
      }
    }
  });
});
