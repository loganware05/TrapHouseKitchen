import stripe, {
  toStripeAmount,
  calculatePrepTime,
  paymentIntentStatusToRecordStatus,
} from '../lib/stripe';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { Coupon, Order, User, Dish, OrderItem } from '@prisma/client';
import { PaymentRecordStatus } from '@prisma/client';
import type Stripe from 'stripe';

type OrderWithRelations = Order & {
  items: (OrderItem & { dish: Dish })[];
  user: User;
};

export async function resolveCouponForCheckout(userId: string, couponCode?: string) {
  if (!couponCode?.trim()) {
    return null;
  }
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase() },
  });
  if (!coupon) {
    throw new AppError('Invalid coupon code', 404);
  }
  if (coupon.userId !== userId) {
    throw new AppError('This coupon does not belong to you', 403);
  }
  if (coupon.used) {
    throw new AppError('This coupon has already been used', 400);
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('This coupon has expired', 400);
  }
  return coupon;
}

export type PaymentIntentResult = {
  clientSecret: string | null;
  paymentIntentId: string;
  paymentId: string;
  amount: number;
  prepTime: number;
  order: OrderWithRelations;
  /** Present when paying with a saved card (server-confirmed PI). */
  stripePaymentStatus?: Stripe.PaymentIntent.Status;
};

export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name,
    metadata: { userId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

async function ensurePaymentMethodOnCustomer(stripePmId: string, customerId: string) {
  const pm = await stripe.paymentMethods.retrieve(stripePmId);
  if (pm.customer === customerId) {
    return;
  }
  if (pm.customer && pm.customer !== customerId) {
    throw new AppError('This saved card cannot be used with your account', 400);
  }
  await stripe.paymentMethods.attach(stripePmId, { customer: customerId });
}

async function persistPaymentMethodForUser(userId: string, stripePmId: string) {
  const pm = await stripe.paymentMethods.retrieve(stripePmId);
  if (pm.type !== 'card' || !pm.card) {
    return;
  }

  const existing = await prisma.savedPaymentMethod.findUnique({
    where: { stripePaymentMethodId: stripePmId },
  });
  if (existing && existing.userId !== userId) {
    console.warn('[payment] Saved PM user mismatch, skipping', stripePmId);
    return;
  }

  const count = await prisma.savedPaymentMethod.count({ where: { userId } });
  await prisma.savedPaymentMethod.upsert({
    where: { stripePaymentMethodId: stripePmId },
    create: {
      userId,
      stripePaymentMethodId: stripePmId,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expiryMonth: pm.card.exp_month,
      expiryYear: pm.card.exp_year,
      isDefault: count === 0,
    },
    update: {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expiryMonth: pm.card.exp_month,
      expiryYear: pm.card.exp_year,
    },
  });
}

/**
 * Call after SetupIntent succeeds (webhook or client redirect) to store card for 1-tap checkout.
 */
export async function syncSavedMethodAfterSetupIntent(userId: string, setupIntentId: string) {
  const si = await stripe.setupIntents.retrieve(setupIntentId);
  if (si.metadata?.userId !== userId) {
    throw new AppError('Unauthorized', 403);
  }
  if (si.status !== 'succeeded') {
    throw new AppError('Card setup was not completed', 400);
  }
  const pmRef = si.payment_method;
  const pmId = typeof pmRef === 'string' ? pmRef : pmRef?.id;
  if (!pmId) {
    throw new AppError('No payment method on setup', 400);
  }
  await persistPaymentMethodForUser(userId, pmId);
}

export async function handleSetupIntentSucceededWebhook(setupIntent: Stripe.SetupIntent) {
  const userId = setupIntent.metadata?.userId;
  if (!userId || setupIntent.status !== 'succeeded') {
    return;
  }
  const pmRef = setupIntent.payment_method;
  const pmId = typeof pmRef === 'string' ? pmRef : pmRef?.id;
  if (!pmId) {
    return;
  }
  await persistPaymentMethodForUser(userId, pmId);
}

export async function createSetupIntentForUser(userId: string) {
  const customerId = await ensureStripeCustomer(userId);
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    metadata: { userId },
  });
  if (!setupIntent.client_secret) {
    throw new AppError('Could not start card setup', 500);
  }
  return { clientSecret: setupIntent.client_secret };
}

export async function listSavedPaymentMethods(userId: string) {
  return prisma.savedPaymentMethod.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function deleteSavedPaymentMethod(userId: string, id: string) {
  const row = await prisma.savedPaymentMethod.findFirst({
    where: { id, userId },
  });
  if (!row) {
    throw new AppError('Payment method not found', 404);
  }
  await stripe.paymentMethods.detach(row.stripePaymentMethodId).catch(() => {});
  const wasDefault = row.isDefault;
  await prisma.savedPaymentMethod.delete({ where: { id: row.id } });
  if (wasDefault) {
    const next = await prisma.savedPaymentMethod.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.savedPaymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
}

export async function setDefaultSavedPaymentMethod(userId: string, id: string) {
  const row = await prisma.savedPaymentMethod.findFirst({
    where: { id, userId },
  });
  if (!row) {
    throw new AppError('Payment method not found', 404);
  }
  await prisma.$transaction([
    prisma.savedPaymentMethod.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.savedPaymentMethod.update({
      where: { id: row.id },
      data: { isDefault: true },
    }),
  ]);
}

function paymentReturnUrl(orderId: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/payment/success?order_id=${encodeURIComponent(orderId)}`;
}

/**
 * Creates a Stripe PaymentIntent and local Payment row. Does not mark coupons as used
 * (that happens in the payment_intent.succeeded webhook).
 */
export async function createPaymentIntentForOrder(params: {
  userId: string;
  orderId: string;
  tipAmount?: number;
  couponCode?: string;
  /** DB id of SavedPaymentMethod — enables server-side confirm (1-tap). */
  savedPaymentMethodId?: string;
}): Promise<PaymentIntentResult> {
  const { userId, orderId, tipAmount = 0, couponCode, savedPaymentMethodId } = params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { dish: true } },
      user: true,
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }
  if (order.userId !== userId) {
    throw new AppError('Unauthorized to pay for this order', 403);
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId,
      status: PaymentRecordStatus.SUCCEEDED,
    },
  });
  if (existingPayment) {
    throw new AppError('Order has already been paid', 400);
  }

  let coupon: Coupon | null = null;
  let discount = 0;
  if (couponCode) {
    coupon = await resolveCouponForCheckout(userId, couponCode);
    if (coupon) {
      discount = coupon.discountAmount;
    }
  }

  const subtotal = order.totalPrice;
  const tip = parseFloat(String(tipAmount)) || 0;
  const total = Math.max(0, subtotal + tip - discount);
  const prepTime = calculatePrepTime(order.items.length);

  const metadata: Record<string, string> = {
    orderId: order.id,
    userId: order.userId,
    customerName: order.user.name,
    customerEmail: order.user.email || '',
    itemCount: order.items.length.toString(),
    prepTime: prepTime.toString(),
  };

  const description = `TrapHouse Kitchen Order #${order.id.slice(0, 8)}`;

  let paymentIntent: Stripe.PaymentIntent;

  if (savedPaymentMethodId) {
    const saved = await prisma.savedPaymentMethod.findFirst({
      where: { id: savedPaymentMethodId, userId },
    });
    if (!saved) {
      throw new AppError('Saved payment method not found', 404);
    }
    const customerId = await ensureStripeCustomer(userId);
    await ensurePaymentMethodOnCustomer(saved.stripePaymentMethodId, customerId);

    paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(total),
      currency: 'usd',
      customer: customerId,
      payment_method: saved.stripePaymentMethodId,
      confirm: true,
      off_session: false,
      return_url: paymentReturnUrl(order.id),
      metadata,
      description,
    });
  } else {
    paymentIntent = await stripe.paymentIntents.create({
      amount: toStripeAmount(total),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
      metadata,
      description,
    });
  }

  const initialRecordStatus = paymentIntentStatusToRecordStatus(paymentIntent.status);

  try {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: subtotal,
        tipAmount: tip,
        totalAmount: total,
        currency: 'usd',
        status: initialRecordStatus,
        paymentMethod: 'CARD',
        metadata: {
          prepTime,
          itemCount: order.items.length,
        },
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        tipAmount: tip,
        finalAmount: total,
        prepTime,
        paymentStatus: paymentIntent.status === 'succeeded' ? 'PAID' : 'PENDING',
        ...(coupon && { appliedCouponId: coupon.id }),
      },
      include: {
        items: { include: { dish: true } },
        user: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
      amount: total,
      prepTime,
      order: updatedOrder,
      stripePaymentStatus: paymentIntent.status,
    };
  } catch (err) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {});
    throw err;
  }
}

/**
 * Marks a coupon as consumed after Stripe confirms payment. Idempotent via used: false guard.
 */
export async function finalizeCouponAfterPayment(orderId: string, couponId: string | null) {
  if (!couponId) {
    return;
  }
  await prisma.coupon.updateMany({
    where: { id: couponId, used: false },
    data: {
      used: true,
      usedOrderId: orderId,
    },
  });
}
