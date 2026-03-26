import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import stripe, { toStripeAmount, fromStripeAmount, paymentIntentStatusToRecordStatus } from '../lib/stripe';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';
import {
  createPaymentIntentForOrder,
  createSetupIntentForUser,
  listSavedPaymentMethods,
  deleteSavedPaymentMethod,
  setDefaultSavedPaymentMethod,
  syncSavedMethodAfterSetupIntent,
} from '../services/payment.service';
import { PaymentRecordStatus } from '@prisma/client';

const router = Router();

function mapSavedMethods(methods: Awaited<ReturnType<typeof listSavedPaymentMethods>>) {
  return methods.map((m) => ({
    id: m.id,
    brand: m.brand,
    last4: m.last4,
    expiryMonth: m.expiryMonth,
    expiryYear: m.expiryYear,
    isDefault: m.isDefault,
  }));
}

router.post(
  '/create-payment-intent',
  authenticate,
  paymentLimiter,
  [
    body('orderId').notEmpty(),
    body('tipAmount').optional().isFloat({ min: 0 }),
    body('couponCode').optional().isString(),
    body('savedPaymentMethodId').optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { orderId, tipAmount = 0, couponCode, savedPaymentMethodId } = req.body;
      const result = await createPaymentIntentForOrder({
        userId: req.user!.id,
        orderId,
        tipAmount,
        couponCode,
        savedPaymentMethodId,
      });
      res.json({
        status: 'success',
        data: {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
          paymentId: result.paymentId,
          amount: result.amount,
          prepTime: result.prepTime,
          stripePaymentStatus: result.stripePaymentStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/status/:paymentId',
  authenticate,
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const { paymentId } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              items: {
                include: {
                  dish: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.order.userId !== req.user!.id) {
        throw new AppError('Unauthorized', 403);
      }

      let stripeStatus = null;
      if (payment.stripePaymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        stripeStatus = paymentIntent.status;
        const mapped = paymentIntentStatusToRecordStatus(stripeStatus);

        if (mapped !== payment.status) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: mapped },
          });
        }
      }

      res.json({
        status: 'success',
        data: {
          payment: {
            ...payment,
            status: stripeStatus || payment.status,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refund/:paymentId',
  authenticate,
  [body('amount').optional().isFloat({ min: 0 }), body('reason').optional().isString()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      if (!['CHEF', 'ADMIN'].includes(req.user!.role)) {
        throw new AppError('Unauthorized', 403);
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.status !== PaymentRecordStatus.SUCCEEDED) {
        throw new AppError('Can only refund successful payments', 400);
      }

      if (!payment.stripePaymentIntentId) {
        throw new AppError('Cannot refund cash payments through this endpoint', 400);
      }

      const refundAmount = amount
        ? toStripeAmount(parseFloat(amount.toString()))
        : toStripeAmount(payment.totalAmount);

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          refundReason: reason || 'Refund requested',
          refundedBy: req.user!.id,
        },
      });

      await prisma.transaction.create({
        data: {
          paymentId: payment.id,
          type: refundAmount === toStripeAmount(payment.totalAmount) ? 'REFUND' : 'PARTIAL_REFUND',
          amount: fromStripeAmount(refundAmount),
          status: refund.status,
          stripeRefundId: refund.id,
          reason: reason || 'Refund requested',
        },
      });

      const isFullRefund = refundAmount === toStripeAmount(payment.totalAmount);
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullRefund ? PaymentRecordStatus.REFUNDED : payment.status,
        },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      res.json({
        status: 'success',
        data: {
          refund: {
            id: refund.id,
            amount: fromStripeAmount(refundAmount),
            status: refund.status,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/config', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      currency: 'usd',
      businessName: 'TrapHouse Kitchen',
      country: 'US',
    },
  });
});

router.post('/setup-intent', authenticate, paymentLimiter, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { clientSecret } = await createSetupIntentForUser(req.user!.id);
    res.json({ status: 'success', data: { clientSecret } });
  } catch (error) {
    next(error);
  }
});

router.get('/methods', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const methods = await listSavedPaymentMethods(req.user!.id);
    res.json({
      status: 'success',
      data: {
        methods: mapSavedMethods(methods),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/methods/:id', authenticate, paymentLimiter, async (req: AuthRequest, res: Response, next: any) => {
  try {
    await deleteSavedPaymentMethod(req.user!.id, req.params.id);
    res.json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/methods/:id/default',
  authenticate,
  paymentLimiter,
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      await setDefaultSavedPaymentMethod(req.user!.id, req.params.id);
      const methods = await listSavedPaymentMethods(req.user!.id);
      res.json({ status: 'success', data: { methods: mapSavedMethods(methods) } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/methods/sync',
  authenticate,
  paymentLimiter,
  [body('setupIntentId').notEmpty()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      await syncSavedMethodAfterSetupIntent(req.user!.id, req.body.setupIntentId);
      const methods = await listSavedPaymentMethods(req.user!.id);
      res.json({ status: 'success', data: { methods: mapSavedMethods(methods) } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
