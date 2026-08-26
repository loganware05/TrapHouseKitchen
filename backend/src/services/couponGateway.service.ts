import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateCouponCode } from '../utils/couponGenerator';

export const REVIEW_APPROVE_GATEWAY = 'REVIEW_APPROVE';

export const GATEWAY_AMOUNT_MIN = 1;
export const GATEWAY_AMOUNT_MAX = 50;

export type CouponAwardGatewayKey = typeof REVIEW_APPROVE_GATEWAY;

export async function ensureDefaultGateways() {
  await prisma.couponAwardGateway.upsert({
    where: { key: REVIEW_APPROVE_GATEWAY },
    create: {
      key: REVIEW_APPROVE_GATEWAY,
      enabled: true,
      discountAmount: 4,
    },
    update: {},
  });
}

export async function listCouponAwardGateways() {
  await ensureDefaultGateways();
  return prisma.couponAwardGateway.findMany({ orderBy: { key: 'asc' } });
}

export async function getCouponAwardGateway(key: string) {
  await ensureDefaultGateways();
  const gateway = await prisma.couponAwardGateway.findUnique({ where: { key } });
  if (!gateway) {
    throw new AppError(`Unknown coupon gateway: ${key}`, 404);
  }
  return gateway;
}

export async function updateCouponAwardGateway(params: {
  key: string;
  enabled?: boolean;
  discountAmount?: number;
  updatedBy?: string;
}) {
  const { key, enabled, discountAmount, updatedBy } = params;
  await getCouponAwardGateway(key);

  if (discountAmount != null) {
    if (
      !Number.isFinite(discountAmount) ||
      discountAmount < GATEWAY_AMOUNT_MIN ||
      discountAmount > GATEWAY_AMOUNT_MAX
    ) {
      throw new AppError(
        `Discount amount must be between $${GATEWAY_AMOUNT_MIN} and $${GATEWAY_AMOUNT_MAX}`,
        400
      );
    }
  }

  return prisma.couponAwardGateway.update({
    where: { key },
    data: {
      ...(enabled != null ? { enabled } : {}),
      ...(discountAmount != null ? { discountAmount: Math.round(discountAmount * 100) / 100 } : {}),
      ...(updatedBy != null ? { updatedBy } : {}),
    },
  });
}

/** Mint a unique coupon code (retry on rare collisions). */
export async function mintUserCoupon(userId: string, discountAmount: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCouponCode();
    try {
      return await prisma.coupon.create({
        data: {
          code,
          userId,
          discountAmount,
          used: false,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') continue;
      throw err;
    }
  }
  throw new AppError('Could not generate a unique coupon code', 500);
}

/**
 * If REVIEW_APPROVE gateway is enabled, approve review and mint coupon in one transaction.
 * Otherwise approve only.
 */
export async function approveReviewWithOptionalCoupon(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { user: true },
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }
  if (review.approved) {
    throw new AppError('Review is already approved', 400);
  }

  const gateway = await getCouponAwardGateway(REVIEW_APPROVE_GATEWAY);

  if (!gateway.enabled) {
    const approvedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { approved: true },
    });
    return {
      review: approvedReview,
      coupon: null as null,
      gatewayEnabled: false,
      message: `Review approved for ${review.user.name}`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    let coupon = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCouponCode();
      try {
        coupon = await tx.coupon.create({
          data: {
            code,
            userId: review.userId,
            discountAmount: gateway.discountAmount,
            used: false,
          },
        });
        break;
      } catch (err: any) {
        if (err?.code === 'P2002') continue;
        throw err;
      }
    }
    if (!coupon) {
      throw new AppError('Could not generate a unique coupon code', 500);
    }
    const approvedReview = await tx.review.update({
      where: { id: reviewId },
      data: { approved: true },
    });
    return { approvedReview, coupon };
  });

  return {
    review: result.approvedReview,
    coupon: result.coupon,
    gatewayEnabled: true,
    message: `Review approved for ${review.user.name}. $${gateway.discountAmount.toFixed(2)} coupon ${result.coupon.code} created.`,
  };
}
