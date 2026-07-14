/**
 * Deterministic @fixture.test data for cross-suite seeds. Call `cleanupFixtures()` in `afterAll`.
 * Not wired into global `tests/setup.ts` teardown (different email domain from @test.local).
 */
import bcrypt from 'bcryptjs';
import {
  UserRole,
  DishStatus,
  OrderStatus,
  PaymentStatus,
  PaymentRecordStatus,
  PaymentMethod,
} from '@prisma/client';
import prisma from '../../src/lib/prisma';

const EMAIL = {
  alice: 'alice-customer@fixture.test',
  bob: 'bob-chef@fixture.test',
  carol: 'carol-admin@fixture.test',
} as const;

const CATEGORY_NAMES = ['Fixture Seed Mains', 'Fixture Seed Sides', 'Fixture Seed Drinks'] as const;

type FixtureState = {
  users: { aliceId: string; bobId: string; carolId: string };
  categoryIds: string[];
  dishIds: string[];
  couponIds: { valid: string; expired: string; used: string };
  orderIds: { completed: string; pending: string; failed: string };
  aiInteractionId: string | null;
};

let state: FixtureState | null = null;

export function getFixtureState(): FixtureState | null {
  return state;
}

export async function seedTestUsers(): Promise<FixtureState['users']> {
  const password = await bcrypt.hash('FixtureSeed1!', 10);
  await prisma.user.deleteMany({
    where: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } },
  });

  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: {
        email: EMAIL.alice,
        name: 'Alice Customer',
        password,
        role: UserRole.CUSTOMER,
      },
    }),
    prisma.user.create({
      data: {
        email: EMAIL.bob,
        name: 'Bob Chef',
        password,
        role: UserRole.CHEF,
      },
    }),
    prisma.user.create({
      data: {
        email: EMAIL.carol,
        name: 'Carol Admin',
        password,
        role: UserRole.ADMIN,
      },
    }),
  ]);

  const users = { aliceId: alice.id, bobId: bob.id, carolId: carol.id };
  state = {
    users,
    categoryIds: [],
    dishIds: [],
    couponIds: { valid: '', expired: '', used: '' },
    orderIds: { completed: '', pending: '', failed: '' },
    aiInteractionId: null,
  };
  return users;
}

export async function seedTestMenu(): Promise<{ categoryIds: string[]; dishIds: string[] }> {
  const users = state?.users ?? (await seedTestUsers());

  await prisma.category.deleteMany({
    where: { name: { in: [...CATEGORY_NAMES] } },
  });

  const categories = await Promise.all(
    CATEGORY_NAMES.map((name, i) =>
      prisma.category.create({
        data: { name, description: `Fixture ${name}`, displayOrder: i },
      })
    )
  );
  const categoryIds = categories.map((c) => c.id);

  const dishSpecs: Array<{
    name: string;
    price: number;
    categoryIdx: number;
    status: DishStatus;
    flags: { isVegan: boolean; isVegetarian: boolean; isGlutenFree: boolean };
  }> = [
    { name: 'Fixture Seed Burger', price: 12.99, categoryIdx: 0, status: DishStatus.AVAILABLE, flags: { isVegan: false, isVegetarian: false, isGlutenFree: false } },
    { name: 'Fixture Seed Tacos', price: 10.5, categoryIdx: 0, status: DishStatus.AVAILABLE, flags: { isVegan: false, isVegetarian: false, isGlutenFree: true } },
    { name: 'Fixture Seed Pasta', price: 11, categoryIdx: 0, status: DishStatus.AVAILABLE, flags: { isVegan: false, isVegetarian: true, isGlutenFree: false } },
    { name: 'Fixture Seed Rice Bowl', price: 9.25, categoryIdx: 1, status: DishStatus.AVAILABLE, flags: { isVegan: true, isVegetarian: true, isGlutenFree: true } },
    { name: 'Fixture Seed Slaw', price: 3.5, categoryIdx: 1, status: DishStatus.AVAILABLE, flags: { isVegan: true, isVegetarian: true, isGlutenFree: true } },
    { name: 'Fixture Seed Wings', price: 8, categoryIdx: 1, status: DishStatus.SEASONAL, flags: { isVegan: false, isVegetarian: false, isGlutenFree: false } },
    { name: 'Fixture Seed Tea', price: 2.5, categoryIdx: 2, status: DishStatus.AVAILABLE, flags: { isVegan: true, isVegetarian: true, isGlutenFree: true } },
    { name: 'Fixture Seed Soda', price: 2, categoryIdx: 2, status: DishStatus.UNAVAILABLE, flags: { isVegan: true, isVegetarian: true, isGlutenFree: true } },
  ];

  const dishes = await Promise.all(
    dishSpecs.map((spec) =>
      prisma.dish.create({
        data: {
          name: spec.name,
          description: `Fixture dish: ${spec.name}`,
          price: spec.price,
          categoryId: categoryIds[spec.categoryIdx],
          status: spec.status,
          ...spec.flags,
        },
      })
    )
  );
  const dishIds = dishes.map((d) => d.id);

  state = {
    users,
    categoryIds,
    dishIds,
    couponIds: state?.couponIds ?? { valid: '', expired: '', used: '' },
    orderIds: state?.orderIds ?? { completed: '', pending: '', failed: '' },
    aiInteractionId: state?.aiInteractionId ?? null,
  };
  return { categoryIds, dishIds };
}

export async function seedTestCoupons(): Promise<FixtureState['couponIds']> {
  const users = state?.users ?? (await seedTestUsers());

  await prisma.coupon.deleteMany({
    where: { code: { in: ['FIXTURE10', 'FIXOLD', 'FIXUSED'] } },
  });

  const valid = await prisma.coupon.create({
    data: {
      userId: users.aliceId,
      code: 'FIXTURE10',
      discountAmount: 1.5,
      used: false,
      expiresAt: null,
    },
  });

  const expired = await prisma.coupon.create({
    data: {
      userId: users.aliceId,
      code: 'FIXOLD',
      discountAmount: 2,
      used: false,
      expiresAt: new Date(Date.now() - 86400000),
    },
  });

  const used = await prisma.coupon.create({
    data: {
      userId: users.aliceId,
      code: 'FIXUSED',
      discountAmount: 3,
      used: true,
      usedOrderId: null,
    },
  });

  const couponIds = { valid: valid.id, expired: expired.id, used: used.id };
  state = {
    ...state!,
    users,
    couponIds,
  };
  return couponIds;
}

export async function seedTestOrders(): Promise<FixtureState['orderIds']> {
  const users = state?.users ?? (await seedTestUsers());
  const dishIds = state?.dishIds.length ? state.dishIds : (await seedTestMenu()).dishIds;

  await prisma.order.deleteMany({ where: { userId: users.aliceId } });

  const d0 = dishIds[0];
  const d1 = dishIds[1];

  const completed = await prisma.order.create({
    data: {
      userId: users.aliceId,
      status: OrderStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 23.49,
      tipAmount: 2,
      finalAmount: 25.49,
      prepTime: 30,
      items: {
        create: [
          { dishId: d0, quantity: 1, priceAtOrder: 12.99 },
          { dishId: d1, quantity: 1, priceAtOrder: 10.5 },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: completed.id,
      stripePaymentIntentId: `pi_fixture_${completed.id.slice(0, 8)}`,
      amount: 23.49,
      tipAmount: 2,
      totalAmount: 25.49,
      currency: 'usd',
      status: PaymentRecordStatus.SUCCEEDED,
      paymentMethod: PaymentMethod.CARD,
    },
  });

  const pending = await prisma.order.create({
    data: {
      userId: users.aliceId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      totalPrice: 9.25,
      finalAmount: 9.25,
      items: {
        create: [{ dishId: dishIds[3], quantity: 1, priceAtOrder: 9.25 }],
      },
    },
  });

  const failed = await prisma.order.create({
    data: {
      userId: users.aliceId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.FAILED,
      totalPrice: 8,
      finalAmount: 8,
      items: {
        create: [{ dishId: dishIds[5], quantity: 1, priceAtOrder: 8 }],
      },
    },
  });

  const orderIds = { completed: completed.id, pending: pending.id, failed: failed.id };
  if (!state) throw new Error('seedTestMenu must run before seedTestOrders');
  state = { ...state, orderIds };
  return orderIds;
}

export async function seedAIInteractionLog(): Promise<string> {
  const users = state?.users ?? (await seedTestUsers());
  const dishIds = state?.dishIds.length ? state.dishIds : (await seedTestMenu()).dishIds;

  const row = await prisma.aIInteraction.create({
    data: {
      userId: users.aliceId,
      type: 'budget_meal',
      inputBudget: 18,
      inputContext: {
        budget: 18,
        excludedAllergenCount: 0,
        dietaryPreferenceCount: 0,
        eligibleDishCount: 8,
        contextHash: 'fixture001',
      } as object,
      outputResponse: {
        combinations: [
          {
            name: 'Fixture combo',
            description: 'Seeded recommendation',
            items: [
              { dishId: dishIds[0], name: 'Fixture Seed Burger', price: 12.99, quantity: 1 },
              { dishId: dishIds[4], name: 'Fixture Seed Slaw', price: 3.5, quantity: 1 },
            ],
            totalPrice: 16.49,
          },
        ],
        llmError: null,
        usedLlm: false,
      } as object,
      latencyMs: 12,
      model: 'fixture-seed',
    },
  });

  if (!state) throw new Error('seedTestUsers must run before seedAIInteractionLog');
  state = { ...state, aiInteractionId: row.id };
  return row.id;
}

/** Seeds users → menu → coupons → orders → sample AI log. Returns aggregated handles. */
export async function seedAllFixtures(): Promise<FixtureState> {
  await seedTestUsers();
  await seedTestMenu();
  await seedTestCoupons();
  await seedTestOrders();
  await seedAIInteractionLog();
  return state!;
}

export async function cleanupFixtures(): Promise<void> {
  await prisma.coupon.deleteMany({
    where: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } },
  });

  await prisma.aIInteraction.deleteMany({
    where: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } },
  });

  await prisma.review.deleteMany({
    where: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } },
  });

  await prisma.transaction.deleteMany({
    where: {
      payment: {
        order: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } },
      },
    },
  });

  await prisma.payment.deleteMany({
    where: { order: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } } },
  });

  await prisma.orderItem.deleteMany({
    where: { order: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } } },
  });

  await prisma.order.deleteMany({
    where: { user: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } } },
  });

  await prisma.dish.deleteMany({
    where: { name: { startsWith: 'Fixture Seed ' } },
  });

  await prisma.category.deleteMany({
    where: { name: { in: [...CATEGORY_NAMES] } },
  });

  await prisma.user.deleteMany({
    where: { email: { in: [EMAIL.alice, EMAIL.bob, EMAIL.carol] } },
  });

  state = null;
}
