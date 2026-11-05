import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== '1') {
    console.error(
      'Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=1 only for an intentional one-shot bootstrap, and never rely on fixed Chef credentials in production.'
    );
    process.exit(1);
  }

  console.log('🌱 Starting database seed...');

  // Create default allergens
  const allergens = [
    { id: '1', name: 'Peanuts', description: 'Tree nuts and peanuts', severity: 'HIGH' },
    { id: '2', name: 'Dairy', description: 'Milk and dairy products', severity: 'MODERATE' },
    { id: '3', name: 'Gluten', description: 'Wheat, barley, rye', severity: 'MODERATE' },
    { id: '4', name: 'Shellfish', description: 'Shrimp, crab, lobster', severity: 'HIGH' },
    { id: '5', name: 'Eggs', description: 'Eggs and egg products', severity: 'MODERATE' },
    { id: '6', name: 'Soy', description: 'Soy and soy products', severity: 'LOW' },
    { id: '7', name: 'Fish', description: 'All fish', severity: 'HIGH' },
    { id: '8', name: 'Sesame', description: 'Sesame seeds', severity: 'MODERATE' },
  ];

  for (const allergen of allergens) {
    await prisma.allergen.upsert({
      where: { id: allergen.id },
      update: {},
      create: allergen,
    });
  }
  console.log('✅ Allergens created');

  // Create default categories
  const categories = [
    { id: '1', name: 'Appetizers', description: 'Start your meal right', displayOrder: 0 },
    { id: '2', name: 'Main Courses', description: 'Hearty main dishes', displayOrder: 1 },
    { id: '3', name: 'Desserts', description: 'Sweet endings', displayOrder: 2 },
    { id: '4', name: 'Beverages', description: 'Drinks and refreshments', displayOrder: 3 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }
  console.log('✅ Categories created');

  // Local/dev Chef bootstrap only. Production Chef accounts must be provisioned and rotated by ops.
  const seedChef = process.env.SEED_CHEF !== '0';
  if (seedChef) {
    const chefEmail = process.env.SEED_CHEF_EMAIL || 'chef@traphouse.com';
    const chefPassword = process.env.SEED_CHEF_PASSWORD || 'chef123';
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_CHEF_PASSWORD) {
      console.error('Production seed requires SEED_CHEF_PASSWORD when SEED_CHEF is enabled.');
      process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(chefPassword, 10);
    await prisma.user.upsert({
      where: { id: 'chef-1' },
      update: {},
      create: {
        id: 'chef-1',
        email: chefEmail,
        password: hashedPassword,
        name: 'Head Chef',
        role: 'CHEF',
        isGuest: false,
      },
    });
    console.log(
      `✅ Chef user upserted (id=chef-1, email=${chefEmail}). Password not logged; override via SEED_CHEF_PASSWORD for local use.`
    );
  } else {
    console.log('⏭️  Skipping Chef bootstrap (SEED_CHEF=0)');
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
