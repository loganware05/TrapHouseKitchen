/**
 * Ops helper: set a user's password by email and bump tokenVersion (invalidates sessions).
 *
 * Usage (never commit the password):
 *   DATABASE_URL=... USER_EMAIL=chef@traphouse.com NEW_PASSWORD='...' npx tsx scripts/set-user-password.ts
 */
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

async function main() {
  const email = process.env.USER_EMAIL?.trim();
  const password = process.env.NEW_PASSWORD;
  if (!email || !password) {
    console.error('USER_EMAIL and NEW_PASSWORD are required');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('NEW_PASSWORD must be at least 12 characters');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const updated = await prisma.user.update({
    where: { email },
    data: {
      password: hashed,
      tokenVersion: { increment: 1 },
    },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });

  console.log(
    `Updated password for ${updated.email} (${updated.id}, role=${updated.role}); tokenVersion=${updated.tokenVersion}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
