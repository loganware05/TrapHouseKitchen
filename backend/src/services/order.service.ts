import prisma from '../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusEmail } from './emailService';
import { AppError } from '../middleware/errorHandler';
import { createPaymentIntentForOrder } from './payment.service';
import {
  ABANDONED_ORDER_MAX_AGE_MS,
  ABANDONED_ORDER_PAYMENT_STATUSES,
  ORDER_LIST_VISIBLE_PAYMENT_STATUSES,
} from './orderVisibility';
import {
  reconcileRecentPendingOrdersForChef,
  reconcileRecentPendingOrdersForUser,
} from './paymentFinalization.service';
import { resolveDeliveryLocation, type DeliveryInput } from './deliveryLocation.service';
import { assertValidOrderStatusTransition } from './orderStatusTransitions';
import { recordPrepTimeObservation } from './prepTimeLearning.service';

export {
  ABANDONED_ORDER_MAX_AGE_MS,
  ABANDONED_ORDER_PAYMENT_STATUSES,
  ORDER_LIST_VISIBLE_PAYMENT_STATUSES,
} from './orderVisibility';

export type OrderItemInput = {
  dishId: string;
  quantity: number;
  customizations?: string | null;
};

interface SetOrderStatusOptions {
  sendEmail?: boolean;
  emailData?: {
    estimatedTime?: string;
  };
  /** Skip linear transition checks (internal/payment paths only). */
  skipTransitionCheck?: boolean;
}

/**
 * Centralized function for updating order status
 * Ensures all side-effects (completedAt, emails, etc.) are consistently applied
 */
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  options?: SetOrderStatusOptions
) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!existing) {
    throw new AppError('Order not found', 404);
  }

  if (!options?.skipTransitionCheck) {
    assertValidOrderStatusTransition(existing.status, status);
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
    },
    include: {
      items: {
        include: {
          dish: true,
        },
      },
      user: true,
    },
  });

  if (
    options?.sendEmail &&
    ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'].includes(status)
  ) {
    sendOrderStatusEmail({
      customerName: order.user.name,
      customerEmail: order.user.email || '',
      orderNumber: order.orderNumber.toString(),
      status,
      estimatedTime: options.emailData?.estimatedTime,
    }).catch(err => console.error('Status email error:', err));
  }

  if (status === 'COMPLETED') {
    recordPrepTimeObservation(orderId).catch(err =>
      console.error('Prep observation error:', err)
    );
  }

  return order;
}

export async function assertNoAllergenConflicts(userId: string, dishIds: string[]) {
  const userAllergens = await prisma.userAllergen.findMany({
    where: { userId },
    select: { allergenId: true },
  });
  if (userAllergens.length === 0) {
    return;
  }
  const allergenIds = userAllergens.map(u => u.allergenId);
  const conflict = await prisma.dishAllergen.findFirst({
    where: {
      dishId: { in: dishIds },
      allergenId: { in: allergenIds },
    },
  });
  if (conflict) {
    throw new AppError(
      'Your order contains items that conflict with your allergen profile',
      400
    );
  }
}

async function buildOrderItemsFromInput(items: OrderItemInput[]) {
  const dishIds = items.map(item => item.dishId);
  const dishes = await prisma.dish.findMany({
    where: {
      id: { in: dishIds },
      status: 'AVAILABLE',
    },
  });
  if (dishes.length !== dishIds.length) {
    throw new AppError('Some dishes are not available', 400);
  }

  let totalPrice = 0;
  const orderItems = items.map(item => {
    const dish = dishes.find(d => d.id === item.dishId);
    if (!dish) {
      throw new AppError('Dish not found', 404);
    }
    totalPrice += dish.price * item.quantity;
    return {
      dishId: item.dishId,
      quantity: item.quantity,
      priceAtOrder: dish.price,
      customizations: item.customizations ?? null,
    };
  });

  return { totalPrice, orderItems };
}

/**
 * Creates an unpaid order (no confirmation emails — those send after successful payment).
 */
export async function createUnpaidOrder(
  userId: string,
  items: OrderItemInput[],
  specialInstructions?: string | null,
  delivery?: DeliveryInput
) {
  await assertNoAllergenConflicts(
    userId,
    items.map(i => i.dishId)
  );
  const { totalPrice, orderItems } = await buildOrderItemsFromInput(items);
  const deliveryLocation = delivery ? resolveDeliveryLocation(delivery) : null;

  return prisma.order.create({
    data: {
      userId,
      totalPrice,
      finalAmount: totalPrice,
      tipAmount: 0,
      specialInstructions: specialInstructions || null,
      deliveryLocation,
      items: {
        create: orderItems,
      },
    },
    include: {
      items: {
        include: {
          dish: true,
        },
      },
      user: true,
    },
  });
}

export async function getCustomerOrdersWithItemReviews(userId: string) {
  await reconcileRecentPendingOrdersForUser(userId);

  const orders = await prisma.order.findMany({
    where: {
      userId,
      isArchived: false,
      paymentStatus: { in: ORDER_LIST_VISIBLE_PAYMENT_STATUSES },
    },
    include: {
      items: {
        include: {
          dish: {
            include: {
              category: true,
            },
          },
        },
      },
      appliedCoupon: {
        select: {
          id: true,
          code: true,
          discountAmount: true,
          used: true,
          usedOrderId: true,
        },
      },
      reviews: {
        where: { userId },
        select: {
          id: true,
          approved: true,
          createdAt: true,
          dishId: true,
          awardCoupon: {
            select: {
              id: true,
              code: true,
              discountAmount: true,
              used: true,
              usedOrderId: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders.map(order => ({
    ...order,
    items: order.items.map(item => ({
      ...item,
      reviews: order.reviews
        .filter(r => r.dishId === item.dishId)
        .map(({ id, approved, createdAt, awardCoupon }) => ({
          id,
          approved,
          createdAt,
          ...(awardCoupon ? { awardCoupon } : {}),
        })),
    })),
  }));
}

export async function getChefOrders(filters: {
  status?: string;
  includeArchived: boolean;
}) {
  await reconcileRecentPendingOrdersForChef();

  return prisma.order.findMany({
    where: {
      paymentStatus: { in: ORDER_LIST_VISIBLE_PAYMENT_STATUSES },
      ...(filters.status && { status: filters.status as OrderStatus }),
      ...(!filters.includeArchived && { isArchived: false }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          dish: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getOrderByIdForUser(orderId: string, userId: string, userRole: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      appliedCoupon: {
        select: {
          id: true,
          code: true,
          discountAmount: true,
          used: true,
          usedOrderId: true,
        },
      },
      items: {
        include: {
          dish: {
            include: {
              category: true,
              allergens: {
                include: {
                  allergen: true,
                },
              },
            },
          },
        },
      },
      reviews: {
        ...(!['CHEF', 'ADMIN'].includes(userRole) ? { where: { userId } } : {}),
        select: {
          id: true,
          approved: true,
          createdAt: true,
          dishId: true,
          awardCoupon: {
            select: {
              id: true,
              code: true,
              discountAmount: true,
              used: true,
              usedOrderId: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.userId !== userId && !['CHEF', 'ADMIN'].includes(userRole)) {
    throw new AppError('Not authorized', 403);
  }

  return {
    ...order,
    items: order.items.map(item => ({
      ...item,
      reviews: order.reviews
        .filter(r => r.dishId === item.dishId)
        .map(({ id, approved, createdAt, awardCoupon }) => ({
          id,
          approved,
          createdAt,
          ...(awardCoupon ? { awardCoupon } : {}),
        })),
    })),
  };
}

export async function createOrderAndPaymentIntent(params: {
  userId: string;
  items: OrderItemInput[];
  specialInstructions?: string | null;
  tipAmount?: number;
  couponCode?: string;
  savedPaymentMethodId?: string;
  deliveryDorm: string;
  deliveryRoomNumber?: string | null;
}) {
  const {
    userId,
    items,
    specialInstructions,
    tipAmount,
    couponCode,
    savedPaymentMethodId,
    deliveryDorm,
    deliveryRoomNumber,
  } = params;
  const order = await createUnpaidOrder(userId, items, specialInstructions, {
    deliveryDorm,
    deliveryRoomNumber,
  });
  try {
    const payment = await createPaymentIntentForOrder({
      userId,
      orderId: order.id,
      tipAmount,
      couponCode,
      savedPaymentMethodId,
    });
    return {
      order: payment.order,
      clientSecret: payment.clientSecret,
      paymentIntentId: payment.paymentIntentId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      prepTime: payment.prepTime,
      stripePaymentStatus: payment.stripePaymentStatus,
    };
  } catch (err) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    throw err;
  }
}

export async function archiveCompletedOrders() {
  return prisma.order.updateMany({
    where: {
      status: { in: ['COMPLETED', 'CANCELLED'] },
      isArchived: false,
    },
    data: {
      isArchived: true,
    },
  });
}

/**
 * Cancels checkout orders that never completed payment within the abandonment window.
 */
export async function cancelAbandonedUnpaidOrders(
  maxAgeMs: number = ABANDONED_ORDER_MAX_AGE_MS
) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  return prisma.order.updateMany({
    where: {
      paymentStatus: { in: ABANDONED_ORDER_PAYMENT_STATUSES },
      status: { not: 'CANCELLED' },
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'CANCELLED',
      appliedCouponId: null,
    },
  });
}

export async function resetOrderNumberSequence() {
  await prisma.$executeRaw`ALTER SEQUENCE "Order_orderNumber_seq" RESTART WITH 1`;
}
