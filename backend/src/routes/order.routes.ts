import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimiter';
import {
  archiveCompletedOrders,
  createOrderAndPaymentIntent,
  createUnpaidOrder,
  getChefOrders,
  getCustomerOrdersWithItemReviews,
  getOrderByIdForUser,
  resetOrderNumberSequence,
  setOrderStatus,
} from '../services/order.service';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const orders = await getCustomerOrdersWithItemReviews(req.user!.id);
    res.json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/all', authenticate, authorize('CHEF', 'ADMIN'), async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { status, includeArchived } = req.query;
    const orders = await getChefOrders({
      ...(status && typeof status === 'string' ? { status } : {}),
      includeArchived: includeArchived === 'true',
    });
    res.json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/checkout',
  authenticate,
  orderLimiter,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.dishId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
    body('tipAmount').optional().isFloat({ min: 0 }),
    body('couponCode').optional().isString(),
    body('specialInstructions').optional().isString(),
    body('savedPaymentMethodId').optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { items, tipAmount = 0, couponCode, specialInstructions, savedPaymentMethodId } = req.body;
      const result = await createOrderAndPaymentIntent({
        userId: req.user!.id,
        items,
        specialInstructions: specialInstructions ?? null,
        tipAmount,
        couponCode,
        savedPaymentMethodId,
      });
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      console.error('Error in checkout:', error);
      if (error.code === 'P2002') {
        return next(new AppError('Order number conflict. Please try again.', 409));
      }
      if (error.code === 'P2003') {
        return next(new AppError('Invalid reference in order data.', 400));
      }
      next(error);
    }
  }
);

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const order = await getOrderByIdForUser(req.params.id, req.user!.id, req.user!.role);
    res.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  authenticate,
  orderLimiter,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.dishId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { items, specialInstructions } = req.body;
      const order = await createUnpaidOrder(req.user!.id, items, specialInstructions ?? null);
      res.status(201).json({
        status: 'success',
        data: { order },
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      if (error.code === 'P2002') {
        return next(new AppError('Order number conflict. Please try again.', 409));
      }
      if (error.code === 'P2003') {
        return next(new AppError('Invalid reference in order data.', 400));
      }
      next(error);
    }
  }
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [body('status').isIn(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { id } = req.params;
      const { status } = req.body;
      const order = await setOrderStatus(id, status, {
        sendEmail: true,
        emailData: {
          estimatedTime: status === 'READY' ? 'Now' : undefined,
        },
      });
      res.json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/archive-completed', authenticate, authorize('CHEF', 'ADMIN'), async (_req: AuthRequest, res: Response, next: any) => {
  try {
    const result = await archiveCompletedOrders();
    res.json({
      status: 'success',
      data: { archivedCount: result.count },
      message: `Successfully archived ${result.count} orders`,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-counter', authenticate, authorize('CHEF', 'ADMIN'), async (_req: AuthRequest, res: Response, next: any) => {
  try {
    await resetOrderNumberSequence();
    res.json({
      status: 'success',
      message: 'Order counter reset to 1. Next order will be #1.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
