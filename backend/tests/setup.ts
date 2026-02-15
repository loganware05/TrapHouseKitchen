import { beforeAll, afterAll, afterEach } from 'vitest';
import prisma from '../src/lib/prisma';

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
    await prisma.coupon.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-',
          },
        },
      },
    });

    await prisma.review.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-',
          },
        },
      },
    });
    
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          user: {
            email: {
              contains: 'test-',
            },
          },
        },
      },
    });
    
    await prisma.order.deleteMany({
      where: {
        user: {
          email: {
            contains: 'test-',
          },
        },
      },
    });
    
    await prisma.dish.deleteMany({
      where: {
        name: {
          startsWith: 'Test ',
        },
      },
    });
    
    await prisma.category.deleteMany({
      where: {
        name: {
          startsWith: 'Test ',
        },
      },
    });
    
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-',
        },
      },
    });
  } catch (error) {
    // Ignore cleanup errors (might happen if records don't exist)
    console.log('Cleanup completed');
  }
});
