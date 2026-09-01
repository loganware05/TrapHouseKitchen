import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

/** SHA-256 hex digest for at-rest reset token storage (lookup by hash). */
export function hashPasswordResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

/** Test/E2E only: persist raw token so Playwright can complete reset without DB plaintext. */
export function capturePasswordResetTokenForE2e(email: string, rawToken: string): void {
  if (process.env.E2E_CAPTURE_PASSWORD_RESET !== '1') {
    return;
  }
  const dir = path.join(process.cwd(), '.agent', 'e2e-capture', 'password-reset');
  fs.mkdirSync(dir, { recursive: true });
  const safeName = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
  fs.writeFileSync(path.join(dir, `${safeName}.token`), rawToken, 'utf8');
}

export function readCapturedPasswordResetToken(email: string): string | null {
  const safeName = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
  const filePath = path.join(
    process.cwd(),
    '.agent',
    'e2e-capture',
    'password-reset',
    `${safeName}.token`
  );
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8').trim();
}
