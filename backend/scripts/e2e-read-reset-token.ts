/**
 * Prints the raw password-reset token for E2E (Playwright only).
 * Tokens are hashed at rest; the API captures the raw token when E2E_CAPTURE_PASSWORD_RESET=1.
 *
 * Usage: cd backend && E2E_CAPTURE_PASSWORD_RESET=1 npx tsx scripts/e2e-read-reset-token.ts <email>
 */
import 'dotenv/config';
import { readCapturedPasswordResetToken } from '../src/lib/passwordResetToken';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npx tsx scripts/e2e-read-reset-token.ts <email>');
    process.exit(1);
  }

  const token = readCapturedPasswordResetToken(email);
  if (!token) {
    console.error(
      `No captured reset token for ${email}. Ensure E2E_CAPTURE_PASSWORD_RESET=1 on the API server.`
    );
    process.exit(1);
  }

  process.stdout.write(token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
