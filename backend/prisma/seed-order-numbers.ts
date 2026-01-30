import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOrderNumbers() {
  console.log('🔄 Assigning sequential order numbers to existing orders...');
  
  try {
    // Get all orders sorted by creation date
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Found ${orders.length} orders to update`);

    // Note: orderNumber is auto-increment, so new orders will automatically get sequential numbers
    // This script is just for documentation - Prisma will handle the migration
    
    console.log('✅ Order numbers will be assigned automatically by Prisma migration');
    console.log('   New orders will continue from the highest existing number');
  } catch (error) {
    console.error('Error seeding order numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedOrderNumbers()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
