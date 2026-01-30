import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function createChefUser() {
  const email = 'chef@traphouse.com';
  const password = 'chef123';
  const name = 'Head Chef';

  try {
    // Check if chef already exists
    const existingChef = await prisma.user.findUnique({
      where: { email },
    });

    if (existingChef) {
      if (existingChef.role === 'CHEF' || existingChef.role === 'ADMIN') {
        console.log('✅ Chef user already exists!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${existingChef.role}`);
        return;
      } else {
        // Update existing user to chef
        const updated = await prisma.user.update({
          where: { email },
          data: { role: 'CHEF' },
        });
        console.log('✅ Updated existing user to CHEF role!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create chef user
    const chef = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'CHEF',
      },
    });

    console.log('✅ Chef user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Chef Login Credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Name: ${name}`);
    console.log(`Role: ${chef.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nYou can now login at: /chef/login');
  } catch (error) {
    console.error('❌ Error creating chef user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createChefUser()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
