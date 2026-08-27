import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import {
  GATEWAY_AMOUNT_MAX,
  GATEWAY_AMOUNT_MIN,
  listCouponAwardGateways,
  updateCouponAwardGateway,
} from '../services/couponGateway.service';

const router = Router();

// Get user's coupons (available + used history)
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        userId: req.user!.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    const available = coupons.filter(
      (c) =>
        !c.used &&
        (!c.expiresAt || c.expiresAt >= new Date())
    );
    const used = coupons.filter((c) => c.used);

    res.json({
      status: 'success',
      data: {
        coupons: available,
        usedCoupons: used,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/gateways', authenticate, authorize('CHEF', 'ADMIN'), async (_req: AuthRequest, res: Response, next: any) => {
  try {
    const gateways = await listCouponAwardGateways();
    res.json({ status: 'success', data: { gateways } });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/gateways/:key',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [
    body('enabled').optional().isBoolean(),
    body('discountAmount').optional().isFloat({ min: GATEWAY_AMOUNT_MIN, max: GATEWAY_AMOUNT_MAX }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      if (req.body.enabled === undefined && req.body.discountAmount === undefined) {
        throw new AppError('Provide enabled and/or discountAmount', 400);
      }
      const gateway = await updateCouponAwardGateway({
        key: req.params.key,
        enabled: req.body.enabled,
        discountAmount: req.body.discountAmount,
        updatedBy: req.user!.id,
      });
      res.json({ status: 'success', data: { gateway } });
    } catch (error) {
      next(error);
    }
  }
);

// Validate coupon code
router.post(
  '/validate',
  authenticate,
  [body('code').notEmpty().withMessage('Coupon code is required')],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { code } = req.body;

      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!coupon) {
        throw new AppError('Invalid coupon code', 404);
      }

      if (coupon.userId !== req.user!.id) {
        throw new AppError('This coupon does not belong to you', 403);
      }

      if (coupon.used) {
        throw new AppError('This coupon has already been used', 400);
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new AppError('This coupon has expired', 400);
      }

      res.json({
        status: 'success',
        data: { 
          coupon,
          valid: true,
          discountAmount: coupon.discountAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Apply coupon to order (called during checkout)
router.post(
  '/apply',
  authenticate,
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { code, orderId } = req.body;

      // Validate coupon
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!coupon) {
        throw new AppError('Invalid coupon code', 404);
      }

      if (coupon.userId !== req.user!.id) {
        throw new AppError('This coupon does not belong to you', 403);
      }

      if (coupon.used) {
        throw new AppError('This coupon has already been used', 400);
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new AppError('This coupon has expired', 400);
      }

      // Validate order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.userId !== req.user!.id) {
        throw new AppError('Not authorized', 403);
      }

      if (order.appliedCouponId) {
        throw new AppError('A coupon has already been applied to this order', 400);
      }

      const heldByOther = await prisma.order.findFirst({
        where: {
          appliedCouponId: coupon.id,
          paymentStatus: { in: ['UNPAID', 'PENDING'] },
          status: { not: 'CANCELLED' },
          id: { not: orderId },
        },
      });
      if (heldByOther) {
        throw new AppError('This coupon is already reserved on another checkout', 400);
      }

      // Conditional update so concurrent applies cannot both win
      const applied = await prisma.order.updateMany({
        where: { id: orderId, appliedCouponId: null },
        data: {
          appliedCouponId: coupon.id,
          finalAmount: Math.max(0, order.finalAmount - coupon.discountAmount),
        },
      });

      if (applied.count === 0) {
        throw new AppError('A coupon has already been applied to this order', 400);
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      res.json({
        status: 'success',
        data: { 
          order: updatedOrder,
          discountApplied: coupon.discountAmount,
        },
        message: `Coupon applied! You saved $${coupon.discountAmount.toFixed(2)}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
