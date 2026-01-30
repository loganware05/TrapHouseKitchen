import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Get user's available coupons
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        userId: req.user!.id,
        used: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { coupons },
    });
  } catch (error) {
    next(error);
  }
});

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

      // Apply coupon to order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          appliedCouponId: coupon.id,
          finalAmount: Math.max(0, order.finalAmount - coupon.discountAmount),
        },
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
