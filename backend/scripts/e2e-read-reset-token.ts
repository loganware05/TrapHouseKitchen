/**
 * Prints passwordResetToken for an email (after POST /auth/forgot-password). For Playwright only.
 * Usage: cd backend && npx tsx scripts/e2e-read-reset-token.ts <email>
 */
import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npx tsx scripts/e2e-read-reset-token.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { passwordResetToken: true },
  });

  process.stdout.write(user?.passwordResetToken ?? '');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
