/**
 * Shared Prisma-backed builders for tests. Use `test-*@test.local` emails and
 * `Test …` names where possible so `tests/setup.ts` cleanup can remove rows.
 */
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import {
  UserRole,
  DishStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
} from '@prisma/client';
import prisma from '../../src/lib/prisma';

export function testEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@test.local`;
}

export async function createTestUser(
  data: Partial<Prisma.UserCreateInput> = {}
) {
  const {
    email,
    name,
    role,
    isGuest,
    ...relationsAndOptionals
  } = data;
  return prisma.user.create({
    data: {
      email: email ?? testEmail(),
      name: (name as string) ?? 'Test Customer',
      role: role ?? UserRole.CUSTOMER,
      isGuest: isGuest ?? false,
      ...relationsAndOptionals,
    },
  });
}

export async function createTestCategory(
  data: Partial<Prisma.CategoryCreateInput> = {}
) {
  const suffix = randomUUID().slice(0, 8);
  const { name, description, displayOrder, ...rest } = data;
  return prisma.category.create({
    data: {
      name: name ?? `Test Category ${suffix}`,
      description: description ?? null,
      displayOrder: displayOrder ?? 0,
      ...rest,
    },
  });
}

export async function createTestDish(
  data: Partial<Prisma.DishUncheckedCreateInput> = {}
) {
  const categoryId = data.categoryId ?? (await createTestCategory()).id;
  const suffix = randomUUID().slice(0, 8);
  const { categoryId: _c, ...rest } = data;
  return prisma.dish.create({
    data: {
      categoryId,
      name: rest.name ?? `Test Dish ${suffix}`,
      description: rest.description ?? 'Test description',
      price: rest.price ?? 9.99,
      status: rest.status ?? DishStatus.AVAILABLE,
      imageUrl: rest.imageUrl,
      prepTime: rest.prepTime,
      spiceLevel: rest.spiceLevel,
      isVegan: rest.isVegan,
      isVegetarian: rest.isVegetarian,
      isGlutenFree: rest.isGlutenFree,
    },
  });
}

export type TestOrderItem = {
  dishId: string;
  quantity: number;
  priceAtOrder: number;
  customizations?: string | null;
};

export async function createTestOrder(params: {
  userId: string;
  items: TestOrderItem[];
  totalPrice?: number;
  finalAmount?: number;
  tipAmount?: number;
  specialInstructions?: string | null;
  paymentStatus?: PaymentStatus;
}) {
  const total =
    params.totalPrice ??
    params.items.reduce((s, i) => s + i.priceAtOrder * i.quantity, 0);
  const tip = params.tipAmount ?? 0;
  const final = params.finalAmount ?? total + tip;

  return prisma.order.create({
    data: {
      userId: params.userId,
      totalPrice: total,
      tipAmount: tip,
      finalAmount: final,
      specialInstructions: params.specialInstructions ?? null,
      paymentStatus: params.paymentStatus ?? PaymentStatus.UNPAID,
      items: {
        create: params.items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          priceAtOrder: i.priceAtOrder,
          customizations: i.customizations ?? null,
        })),
      },
    },
    include: {
      items: { include: { dish: true } },
      user: true,
    },
  });
}

/** One-line helper: dish + order line for the given user. */
export async function createTestOrderWithOneDish(userId: string) {
  const dish = await createTestDish();
  const order = await createTestOrder({
    userId,
    items: [
      {
        dishId: dish.id,
        quantity: 1,
        priceAtOrder: dish.price,
      },
    ],
  });
  return { dish, order };
}

export async function createTestCoupon(
  userId: string,
  overrides: Partial<Omit<Prisma.CouponUncheckedCreateInput, 'userId'>> = {}
) {
  const o = overrides;
  return prisma.coupon.create({
    data: {
      userId,
      code:
        o.code ??
        `T${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      discountAmount: o.discountAmount ?? 4,
      used: o.used ?? false,
      usedOrderId: o.usedOrderId ?? null,
      expiresAt: o.expiresAt ?? null,
    },
  });
}

export async function createTestPayment(
  orderId: string,
  overrides: Partial<Omit<Prisma.PaymentUncheckedCreateInput, 'orderId'>> = {}
) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const amount = overrides.amount ?? order.finalAmount;
  const tip = overrides.tipAmount ?? order.tipAmount;
  return prisma.payment.create({
    data: {
      orderId,
      amount,
      tipAmount: tip,
      totalAmount: overrides.totalAmount ?? amount + tip,
      currency: overrides.currency ?? 'usd',
      status: overrides.status ?? PaymentRecordStatus.PENDING,
      paymentMethod: overrides.paymentMethod ?? PaymentMethod.CARD,
      stripePaymentIntentId: overrides.stripePaymentIntentId ?? null,
      paymentMethodDetails: overrides.paymentMethodDetails ?? undefined,
      receiptUrl: overrides.receiptUrl ?? null,
      failureReason: overrides.failureReason ?? null,
      metadata: overrides.metadata ?? undefined,
    },
  });
}
