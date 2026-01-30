import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function setupChefAndDish() {
  const email = 'chef@traphouse.com';
  const password = 'chef123';
  const name = 'Head Chef';

  try {
    console.log('🔧 Setting up chef user and test dish...\n');

    // Step 1: Create or update chef user
    let chef = await prisma.user.findUnique({
      where: { email },
    });

    if (!chef) {
      const hashedPassword = await bcrypt.hash(password, 12);
      chef = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'CHEF',
        },
      });
      console.log('✅ Created chef user');
    } else if (chef.role !== 'CHEF' && chef.role !== 'ADMIN') {
      chef = await prisma.user.update({
        where: { email },
        data: { role: 'CHEF' },
      });
      console.log('✅ Updated user to CHEF role');
    } else {
      console.log('✅ Chef user already exists');
    }

    console.log(`\n📧 Chef Login Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${chef.role}\n`);

    // Step 2: Get or create a category
    let category = await prisma.category.findFirst({
      where: { name: 'Main Courses' },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Main Courses',
          description: 'Hearty main dishes',
          displayOrder: 1,
        },
      });
      console.log('✅ Created "Main Courses" category');
    } else {
      console.log('✅ Found "Main Courses" category');
    }

    // Step 3: Create a test dish
    const dishName = 'Chef Special Burger';
    const existingDish = await prisma.dish.findFirst({
      where: { name: dishName },
    });

    if (!existingDish) {
      const dish = await prisma.dish.create({
        data: {
          name: dishName,
          description: 'Our signature burger with special sauce, lettuce, tomato, and pickles. Served with crispy fries.',
          price: 15.99,
          categoryId: category.id,
          status: 'AVAILABLE',
          prepTime: 20,
          spiceLevel: 2,
          isVegan: false,
          isVegetarian: false,
          isGlutenFree: false,
        },
      });
      console.log(`✅ Created test dish: "${dish.name}"`);
      console.log(`   Price: $${dish.price.toFixed(2)}`);
      console.log(`   Prep Time: ${dish.prepTime} minutes`);
    } else {
      console.log(`✅ Test dish "${dishName}" already exists`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now:');
    console.log('1. Login at: /chef/login');
    console.log('2. Use credentials above');
    console.log('3. Navigate to Chef Dashboard');
    console.log('4. View the test dish in the menu');
    console.log('5. Add more dishes from the Chef Menu page\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupChefAndDish()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
