/**
 * Migration script to convert order-based reviews to dish-based reviews
 * This script:
 * 1. Adds dishId column to existing reviews (using first dish from dishNames array)
 * 2. Adds dishName column (extracting from dishNames)
 * 3. Updates constraints
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateReviews() {
  console.log('🔄 Starting review migration to dish-based system...\n');

  try {
    // Get all existing reviews
    const reviews = await prisma.$queryRaw`
      SELECT id, "orderId", "dishNames"::text
      FROM "Review"
      WHERE "dishId" IS NULL
    ` as Array<{ id: string; orderId: string; dishNames: string }>;

    console.log(`Found ${reviews.length} reviews to migrate\n`);

    for (const review of reviews) {
      try {
        // Parse dishNames JSON
        let dishNamesArray: string[] = [];
        try {
          dishNamesArray = JSON.parse(review.dishNames || '[]');
        } catch {
          console.warn(`  ⚠️  Could not parse dishNames for review ${review.id}, skipping`);
          continue;
        }

        if (dishNamesArray.length === 0) {
          console.warn(`  ⚠️  No dish names found for review ${review.id}, skipping`);
          continue;
        }

        // Get the first dish name
        const firstDishName = dishNamesArray[0];

        // Find the dish by name from the order
        const order = await prisma.order.findUnique({
          where: { id: review.orderId },
          include: {
            items: {
              include: {
                dish: true,
              },
            },
          },
        });

        if (!order) {
          console.warn(`  ⚠️  Order ${review.orderId} not found for review ${review.id}, skipping`);
          continue;
        }

        // Find dish by name in order items
        const orderItem = order.items.find(
          (item) => item.dish.name === firstDishName
        );

        if (!orderItem) {
          console.warn(
            `  ⚠️  Dish "${firstDishName}" not found in order ${review.orderId} for review ${review.id}, skipping`
          );
          continue;
        }

        // Update review with dishId and dishName
        await prisma.$executeRaw`
          UPDATE "Review"
          SET 
            "dishId" = ${orderItem.dishId},
            "dishName" = ${firstDishName},
            "orderItemId" = ${orderItem.id}
          WHERE id = ${review.id}
        `;

        console.log(`  ✅ Migrated review ${review.id} → dish: ${firstDishName}`);
      } catch (error) {
        console.error(`  ❌ Error migrating review ${review.id}:`, error);
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateReviews();
