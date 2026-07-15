/**
 * Idempotent seed for Playwright chef E2E: chef user, customer, completed order, pending review.
 * Run from repo root: cd backend && npx tsx scripts/e2e-seed-chef-flow.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

const chefEmail = process.env.E2E_CHEF_EMAIL ?? 'integration-e2e-chef@local.test';
const chefPassword = process.env.E2E_CHEF_PASSWORD ?? 'E2E-Chef-Pass-123';
const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'integration-e2e-customer@local.test';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'E2E-Customer-Pass-123';

async function main() {
  const chefHash = await bcrypt.hash(chefPassword, 10);
  const customerHash = await bcrypt.hash(customerPassword, 10);

  const chef = await prisma.user.upsert({
    where: { email: chefEmail },
    create: {
      email: chefEmail,
      name: 'E2E Chef',
      password: chefHash,
      role: 'CHEF',
    },
    update: { password: chefHash, role: 'CHEF' },
  });

  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      name: 'E2E Customer',
      password: customerHash,
      role: 'CUSTOMER',
    },
    update: { password: customerHash },
  });

  let category = await prisma.category.findFirst({
    where: { name: 'E2E Seed Category' },
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'E2E Seed Category',
        description: 'playwright',
        displayOrder: 999,
      },
    });
  }

  let dish = await prisma.dish.findFirst({
    where: { name: 'E2E Seed Burger' },
  });
  if (!dish) {
    dish = await prisma.dish.create({
      data: {
        name: 'E2E Seed Burger',
        description: 'e2e',
        price: 8.99,
        categoryId: category.id,
        status: 'AVAILABLE',
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false,
      },
    });
  }

  let pendingReview = await prisma.review.findFirst({
    where: {
      approved: false,
      userId: customer.id,
      comment: { contains: 'E2E pending review' },
    },
  });

  let order = pendingReview
    ? await prisma.order.findUniqueOrThrow({ where: { id: pendingReview.orderId } })
    : null;

  if (!pendingReview) {
    order = await prisma.order.create({
      data: {
        userId: customer.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        totalPrice: dish.price,
        tipAmount: 0,
        finalAmount: dish.price,
        completedAt: new Date(),
        items: {
          create: [{ dishId: dish.id, quantity: 1, priceAtOrder: dish.price }],
        },
      },
    });

    pendingReview = await prisma.review.create({
      data: {
        orderId: order.id,
        dishId: dish.id,
        userId: customer.id,
        rating: 5,
        comment: 'E2E pending review — approve me in the chef panel.',
        dishName: dish.name,
        approved: false,
      },
    });
  }

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.coupon.upsert({
    where: { code: 'E2E10OFF' },
    create: {
      code: 'E2E10OFF',
      userId: customer.id,
      discountAmount: 1,
      used: false,
      expiresAt: future,
    },
    update: {
      userId: customer.id,
      discountAmount: 1,
      used: false,
      expiresAt: future,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'E2EEXPIRED' },
    create: {
      code: 'E2EEXPIRED',
      userId: customer.id,
      discountAmount: 1,
      used: false,
      expiresAt: past,
    },
    update: {
      userId: customer.id,
      discountAmount: 1,
      used: false,
      expiresAt: past,
    },
  });

  let trackingOrder = await prisma.order.findFirst({
    where: { userId: customer.id, specialInstructions: 'E2E_ORDER_TRACKING' },
  });

  if (!trackingOrder) {
    trackingOrder = await prisma.order.create({
      data: {
        userId: customer.id,
        status: 'PENDING',
        paymentStatus: 'PAID',
        totalPrice: dish.price,
        tipAmount: 0,
        finalAmount: dish.price,
        specialInstructions: 'E2E_ORDER_TRACKING',
        items: {
          create: [{ dishId: dish.id, quantity: 1, priceAtOrder: dish.price }],
        },
      },
    });
  } else {
    trackingOrder = await prisma.order.update({
      where: { id: trackingOrder.id },
      data: {
        status: 'PENDING',
        paymentStatus: 'PAID',
        totalPrice: dish.price,
        finalAmount: dish.price,
        tipAmount: 0,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        chefId: chef.id,
        customerId: customer.id,
        orderId: order!.id,
        reviewId: pendingReview!.id,
        dishId: dish.id,
        trackingOrderId: trackingOrder.id,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
