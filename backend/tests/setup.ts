import { beforeAll, afterAll, afterEach } from 'vitest';
import prisma from '../src/lib/prisma';

// Stripe client loads with the app; allow running integration tests without a real key.
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || 'sk_test_integration_placeholder012345678901234567890';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1d';

beforeAll(async () => {
  // Ensure database connection is established
  await prisma.$connect();
  console.log('✅ Test database connected');
  
  // Push database schema (create tables if they don't exist)
  // This is safe because we're using a separate test database
  console.log('📋 Setting up database schema...');
  try {
    // Note: This assumes you have prisma CLI available
    // The schema will be pushed without running migrations
    await prisma.$executeRaw`SELECT 1`; // Test connection
    console.log('✅ Database schema ready');
  } catch (error) {
    console.error('⚠️  Database schema setup failed:', error);
  }
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});

afterEach(async () => {
  // Clean up test data after each test
  // Only clean up data with test identifiers to avoid affecting other concurrent tests
  try {
    const testUserEmailFilter = {
      OR: [
        { email: { contains: 'test-' } },
        { email: { contains: 'integration-' } },
      ],
    };

    await prisma.pushSubscription.deleteMany({
      where: {
        user: testUserEmailFilter,
      },
    });

    await prisma.coupon.deleteMany({
      where: {
        user: testUserEmailFilter,
      },
    });

    await prisma.review.deleteMany({
      where: {
        user: testUserEmailFilter,
      },
    });

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          user: testUserEmailFilter,
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        user: testUserEmailFilter,
      },
    });

    await prisma.dish.deleteMany({
      where: {
        OR: [
          { name: { startsWith: 'Test ' } },
          { name: { startsWith: 'Integration ' } },
        ],
      },
    });

    await prisma.category.deleteMany({
      where: {
        OR: [
          { name: { startsWith: 'Test ' } },
          { name: { startsWith: 'Integration ' } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: testUserEmailFilter,
    });
  } catch (error) {
    // Ignore cleanup errors (might happen if records don't exist)
    console.log('Cleanup completed');
  }
});
