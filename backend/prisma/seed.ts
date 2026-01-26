import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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

  // Create default chef account (password: chef123)
  const hashedPassword = await bcrypt.hash('chef123', 10);
  await prisma.user.upsert({
    where: { id: 'chef-1' },
    update: {},
    create: {
      id: 'chef-1',
      email: 'chef@traphouse.com',
      password: hashedPassword,
      name: 'Head Chef',
      role: 'CHEF',
      isGuest: false,
    },
  });
  console.log('✅ Chef user created (email: chef@traphouse.com, password: chef123)');

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
