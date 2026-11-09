import type Stripe from 'stripe';
import stripe, { fromStripeAmount } from '../lib/stripe';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { PaymentRecordStatus, Prisma } from '@prisma/client';
import { setOrderStatus } from './order.service';
import {
  sendNewOrderNotificationToChef,
  sendOrderConfirmationEmail,
} from './emailService';

export type FinalizePaymentOptions = {
  sendEmails?: boolean;
};

async function loadPaymentByIntentId(paymentIntentId: string) {
  return prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      order: {
        include: {
          items: { include: { dish: true } },
          user: true,
        },
      },
    },
  });
}

function paymentIntentHasExpandedCharges(
  paymentIntent: Stripe.PaymentIntent
): paymentIntent is Stripe.PaymentIntent & { charges: Stripe.ApiList<Stripe.Charge> } {
  return 'charges' in paymentIntent && !!(paymentIntent as { charges?: Stripe.ApiList<Stripe.Charge> }).charges;
}

function extractChargeDetails(expandedPaymentIntent: Stripe.PaymentIntent) {
  const paymentMethodDetails: { card?: { brand: string; last4: string; exp_month: number; exp_year: number } } = {};
  let receiptUrl: string | null = null;
  let chargeId: string | null = null;

  const charges = (expandedPaymentIntent as Stripe.PaymentIntent & {
    charges?: Stripe.ApiList<Stripe.Charge>;
  }).charges;

  if (charges?.data?.length) {
    const charge = charges.data[0];
    chargeId = charge.id;
    receiptUrl = charge.receipt_url || null;

    if (charge.payment_method_details?.card) {
      paymentMethodDetails.card = {
        brand: charge.payment_method_details.card.brand,
        last4: charge.payment_method_details.card.last4,
        exp_month: charge.payment_method_details.card.exp_month,
        exp_year: charge.payment_method_details.card.exp_year,
      };
    }
  }

  return { paymentMethodDetails, receiptUrl, chargeId };
}

/**
 * Idempotently marks an order paid when Stripe reports payment_intent.succeeded.
 * Safe under duplicate webhooks and concurrent client sync (row locks + single CHARGE).
 */
export async function finalizeSuccessfulPayment(
  paymentIntent: Stripe.PaymentIntent,
  options: FinalizePaymentOptions = {}
) {
  const sendEmails = options.sendEmails ?? true;
  const existing = await loadPaymentByIntentId(paymentIntent.id);

  if (!existing) {
    console.error('Payment not found for PaymentIntent:', paymentIntent.id);
    return { applied: false as const, reason: 'payment_not_found' as const };
  }

  const expandedPaymentIntent = paymentIntentHasExpandedCharges(paymentIntent)
    ? paymentIntent
    : await stripe.paymentIntents.retrieve(paymentIntent.id, {
        expand: ['charges.data.payment_method_details'],
      });

  const { paymentMethodDetails, receiptUrl, chargeId } =
    extractChargeDetails(expandedPaymentIntent);

  const { wasPaid, orderId } = await prisma.$transaction(async (tx) => {
    // Serialize concurrent finalize/sync against the same payment + order rows.
    await tx.$executeRaw`
      SELECT p.id FROM "Payment" p
      WHERE p.id = ${existing.id}
      FOR UPDATE
    `;
    await tx.$executeRaw`
      SELECT o.id FROM "Order" o
      WHERE o.id = ${existing.orderId}
      FOR UPDATE
    `;

    const lockedPayment = await tx.payment.findUnique({
      where: { id: existing.id },
      include: { order: true },
    });
    if (!lockedPayment) {
      return { wasPaid: false, orderId: existing.orderId };
    }

    const alreadyPaid = lockedPayment.order.paymentStatus === 'PAID';

    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: {
        status: PaymentRecordStatus.SUCCEEDED,
        paymentMethodDetails: paymentMethodDetails as Prisma.InputJsonValue,
        receiptUrl,
      },
    });

    const existingCharge = await tx.transaction.findFirst({
      where: {
        paymentId: lockedPayment.id,
        type: 'CHARGE',
      },
    });

    if (!existingCharge) {
      try {
        await tx.transaction.create({
          data: {
            paymentId: lockedPayment.id,
            type: 'CHARGE',
            amount: fromStripeAmount(paymentIntent.amount),
            status: 'succeeded',
            stripeChargeId: chargeId,
          },
        });
      } catch (error) {
        // Unique stripeChargeId (or concurrent insert) — treat as already recorded.
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        ) {
          throw error;
        }
      }
    }

    // Never reverse fulfillment: paid orders that are still PENDING stay PENDING;
    // PREPARING+ keep kitchen progress. Only paymentStatus is forced to PAID.
    await tx.order.update({
      where: { id: lockedPayment.orderId },
      data: {
        paymentStatus: 'PAID',
      },
    });

    if (lockedPayment.order.appliedCouponId) {
      await tx.coupon.updateMany({
        where: { id: lockedPayment.order.appliedCouponId, used: false },
        data: {
          used: true,
          usedOrderId: lockedPayment.orderId,
        },
      });
    }

    return {
      wasPaid: alreadyPaid,
      orderId: lockedPayment.orderId,
    };
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { dish: true } },
      user: true,
    },
  });

  if (order && sendEmails && !wasPaid) {
    const orderDate = new Date(order.createdAt).toLocaleString();
    const emailPayload = {
      customerName: order.user.name,
      customerEmail: order.user.email || '',
      orderNumber: order.orderNumber.toString(),
      orderDate,
      items: order.items.map((item) => ({
        name: item.dish.name,
        quantity: item.quantity,
        price: item.priceAtOrder,
      })),
      subtotal: order.totalPrice,
      tip: order.tipAmount,
      total: order.finalAmount,
      paymentStatus: 'PAID',
      prepTime: order.prepTime || 25,
      specialInstructions: order.specialInstructions || undefined,
    };

    sendOrderConfirmationEmail(emailPayload).catch((err) =>
      console.error('Confirmation email error:', err)
    );
    sendNewOrderNotificationToChef(emailPayload).catch((err) =>
      console.error('Chef notification email error:', err)
    );
  }

  return {
    applied: true as const,
    orderId,
    paymentStatus: 'PAID' as const,
    alreadyPaid: wasPaid,
  };
}

export async function finalizeFailedPayment(paymentIntent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { order: true },
  });

  if (!payment) {
    return { applied: false as const, reason: 'payment_not_found' as const };
  }

  // Success wins over a late failure webhook / race.
  if (
    payment.order.paymentStatus === 'PAID' ||
    payment.order.paymentStatus === 'REFUNDED' ||
    payment.order.paymentStatus === 'PARTIALLY_REFUNDED' ||
    payment.status === PaymentRecordStatus.SUCCEEDED ||
    payment.status === PaymentRecordStatus.REFUNDED
  ) {
    return {
      applied: false as const,
      reason: 'already_succeeded' as const,
      orderId: payment.orderId,
    };
  }

  const failureReason =
    paymentIntent.last_payment_error?.message || 'Payment failed';

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentRecordStatus.FAILED,
      failureReason,
    },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: 'FAILED',
    },
  });

  return { applied: true as const, orderId: payment.orderId };
}

/**
 * Apply a Stripe charge.refunded event idempotently.
 */
export async function finalizeChargeRefunded(charge: Stripe.Charge) {
  const transaction = await prisma.transaction.findFirst({
    where: { stripeChargeId: charge.id },
    include: { payment: true },
  });

  if (!transaction) {
    console.error('Transaction not found for charge:', charge.id);
    return { applied: false as const, reason: 'charge_not_found' as const };
  }

  const totalRefunded = fromStripeAmount(charge.amount_refunded);
  const totalAmount = transaction.payment.totalAmount;
  const isFullRefund = totalRefunded >= totalAmount - 0.001;

  const refundIds = (charge.refunds?.data ?? [])
    .map((r) => r.id)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT id FROM "Payment" WHERE id = ${transaction.paymentId} FOR UPDATE
    `;
    await tx.$executeRaw`
      SELECT id FROM "Order" WHERE id = ${transaction.payment.orderId} FOR UPDATE
    `;

    for (const refundId of refundIds) {
      const existingRefund = await tx.transaction.findFirst({
        where: { stripeRefundId: refundId },
      });
      if (existingRefund) {
        continue;
      }
      const stripeRefund = charge.refunds?.data?.find((r) => r.id === refundId);
      const refundAmount = stripeRefund
        ? fromStripeAmount(stripeRefund.amount)
        : totalRefunded;
      try {
        await tx.transaction.create({
          data: {
            paymentId: transaction.paymentId,
            type: isFullRefund ? 'REFUND' : 'PARTIAL_REFUND',
            amount: refundAmount,
            status: stripeRefund?.status || 'succeeded',
            stripeRefundId: refundId,
            reason: 'Stripe charge.refunded',
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        ) {
          throw error;
        }
      }
    }

    // If Stripe omitted refund list, still ensure a single synthetic refund row once.
    if (refundIds.length === 0 && totalRefunded > 0) {
      const anyRefund = await tx.transaction.findFirst({
        where: {
          paymentId: transaction.paymentId,
          type: { in: ['REFUND', 'PARTIAL_REFUND'] },
        },
      });
      if (!anyRefund) {
        await tx.transaction.create({
          data: {
            paymentId: transaction.paymentId,
            type: isFullRefund ? 'REFUND' : 'PARTIAL_REFUND',
            amount: totalRefunded,
            status: 'succeeded',
            reason: 'Stripe charge.refunded',
          },
        });
      }
    }

    await tx.payment.update({
      where: { id: transaction.paymentId },
      data: {
        status: isFullRefund ? PaymentRecordStatus.REFUNDED : PaymentRecordStatus.SUCCEEDED,
      },
    });

    await tx.order.update({
      where: { id: transaction.payment.orderId },
      data: {
        paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        ...(isFullRefund ? { status: 'CANCELLED' as const } : {}),
      },
    });
  });

  return {
    applied: true as const,
    orderId: transaction.payment.orderId,
    isFullRefund,
  };
}

/**
 * Reconcile an order against Stripe after client-side confirmPayment succeeds.
 */
export async function syncOrderPaymentFromStripe(
  orderId: string,
  userId: string,
  userRole: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, paymentStatus: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }
  const canAccess =
    order.userId === userId || ['CHEF', 'ADMIN'].includes(userRole);
  if (!canAccess) {
    throw new AppError('Unauthorized', 403);
  }
  if (order.paymentStatus === 'PAID') {
    return {
      orderId,
      paymentStatus: 'PAID' as const,
      synced: false,
      stripeStatus: 'succeeded' as const,
    };
  }

  const payment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  if (!payment?.stripePaymentIntentId) {
    throw new AppError('No payment session for this order', 404);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.stripePaymentIntentId,
    { expand: ['charges.data.payment_method_details'] }
  );

  if (paymentIntent.status === 'succeeded') {
    const result = await finalizeSuccessfulPayment(paymentIntent, { sendEmails: true });
    return {
      orderId,
      paymentStatus: 'PAID' as const,
      synced: result.applied && !result.alreadyPaid,
      stripeStatus: paymentIntent.status,
    };
  }

  if (paymentIntent.status === 'canceled') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentRecordStatus.CANCELED },
    });
    await setOrderStatus(orderId, 'CANCELLED', { sendEmail: false });
    return {
      orderId,
      paymentStatus: order.paymentStatus,
      synced: true,
      stripeStatus: paymentIntent.status,
    };
  }

  return {
    orderId,
    paymentStatus: order.paymentStatus,
    synced: false,
    stripeStatus: paymentIntent.status,
  };
}

const RECONCILE_MAX_ORDERS = 8;
const RECONCILE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Best-effort Stripe reconciliation for recent checkout orders still marked pending.
 * Keeps list views accurate when webhooks lag or fail.
 */
export async function reconcileRecentPendingOrdersForUser(userId: string) {
  const cutoff = new Date(Date.now() - RECONCILE_MAX_AGE_MS);
  const pending = await prisma.order.findMany({
    where: {
      userId,
      paymentStatus: { in: ['UNPAID', 'PENDING'] },
      status: { not: 'CANCELLED' },
      createdAt: { gte: cutoff },
      payments: { some: { stripePaymentIntentId: { not: null } } },
    },
    orderBy: { createdAt: 'desc' },
    take: RECONCILE_MAX_ORDERS,
    select: { id: true },
  });

  for (const order of pending) {
    try {
      await syncOrderPaymentFromStripe(order.id, userId, 'CUSTOMER');
    } catch (error) {
      console.warn('[payment] reconcile skipped for order', order.id, error);
    }
  }
}

export async function reconcileRecentPendingOrdersForChef() {
  const cutoff = new Date(Date.now() - RECONCILE_MAX_AGE_MS);
  const pending = await prisma.order.findMany({
    where: {
      paymentStatus: { in: ['UNPAID', 'PENDING'] },
      status: { not: 'CANCELLED' },
      createdAt: { gte: cutoff },
      payments: { some: { stripePaymentIntentId: { not: null } } },
    },
    orderBy: { createdAt: 'desc' },
    take: RECONCILE_MAX_ORDERS,
    select: { id: true, userId: true },
  });

  for (const order of pending) {
    try {
      await syncOrderPaymentFromStripe(order.id, order.userId, 'CHEF');
    } catch (error) {
      console.warn('[payment] chef reconcile skipped for order', order.id, error);
    }
  }
}
