import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import stripe, { toStripeAmount, fromStripeAmount, calculatePrepTime } from '../lib/stripe';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Create Payment Intent
router.post(
  '/create-payment-intent',
  authenticate,
  paymentLimiter,
  [
    body('orderId').notEmpty(),
    body('paymentMethod').isIn(['card', 'apple_pay', 'cash_app_pay']),
    body('tipAmount').optional().isFloat({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { orderId, paymentMethod, tipAmount = 0 } = req.body;

      // Fetch the order with items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              dish: true,
            },
          },
          user: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Verify the order belongs to the authenticated user
      if (order.userId !== req.user!.id) {
        throw new AppError('Unauthorized to pay for this order', 403);
      }

      // Check if order already has a successful payment
      const existingPayment = await prisma.payment.findFirst({
        where: {
          orderId,
          status: 'succeeded',
        },
      });

      if (existingPayment) {
        throw new AppError('Order has already been paid', 400);
      }

      // Calculate amounts
      const subtotal = order.totalPrice;
      const tip = parseFloat(tipAmount.toString()) || 0;
      const total = subtotal + tip;

      // Calculate prep time
      const prepTime = calculatePrepTime(order.items.length);

      // Create Payment Intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(total),
        currency: 'usd',
        payment_method_types: paymentMethod === 'card' 
          ? ['card']
          : paymentMethod === 'apple_pay'
          ? ['card'] // Apple Pay uses card payment method
          : ['cashapp'], // Cash App Pay
        metadata: {
          orderId: order.id,
          userId: order.userId,
          customerName: order.user.name,
          customerEmail: order.user.email || '',
          itemCount: order.items.length.toString(),
          prepTime: prepTime.toString(),
        },
        description: `TrapHouse Kitchen Order #${order.id.slice(0, 8)}`,
      });

      // Create Payment record in database
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: paymentIntent.id,
          amount: subtotal,
          tipAmount: tip,
          totalAmount: total,
          currency: 'usd',
          status: 'pending',
          paymentMethod: paymentMethod.toUpperCase() as any,
          metadata: {
            prepTime,
            itemCount: order.items.length,
          },
        },
      });

      // Update order with tip and prep time
      await prisma.order.update({
        where: { id: orderId },
        data: {
          tipAmount: tip,
          finalAmount: total,
          prepTime,
          paymentStatus: 'PENDING',
        },
      });

      res.json({
        status: 'success',
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          paymentId: payment.id,
          amount: total,
          prepTime,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Confirm Payment (for Cash on Pickup)
router.post(
  '/confirm-cash-payment',
  authenticate,
  [body('orderId').notEmpty()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { orderId } = req.body;

      // Fetch the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Verify the order belongs to the authenticated user
      if (order.userId !== req.user!.id) {
        throw new AppError('Unauthorized', 403);
      }

      // Calculate prep time
      const prepTime = calculatePrepTime(order.items.length);

      // Create Payment record for cash
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalPrice,
          tipAmount: order.tipAmount,
          totalAmount: order.finalAmount,
          currency: 'usd',
          status: 'pending', // Will be marked as succeeded when chef confirms
          paymentMethod: 'CASH',
          metadata: {
            prepTime,
            itemCount: order.items.length,
            paymentType: 'cash_on_pickup',
          },
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          paymentStatus: 'UNPAID', // Will pay when picking up
          prepTime,
        },
      });

      res.json({
        status: 'success',
        data: {
          paymentId: payment.id,
          orderId: order.id,
          prepTime,
          message: 'Order confirmed. Please pay when picking up your order.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get Payment Status
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

      // Verify authorization
      if (payment.order.userId !== req.user!.id) {
        throw new AppError('Unauthorized', 403);
      }

      // If payment has Stripe Payment Intent, fetch latest status
      let stripeStatus = null;
      if (payment.stripePaymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId
        );
        stripeStatus = paymentIntent.status;

        // Update local payment status if different
        if (stripeStatus !== payment.status) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: stripeStatus },
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

// Refund Payment (Chef only)
router.post(
  '/refund/:paymentId',
  authenticate,
  [
    body('amount').optional().isFloat({ min: 0 }),
    body('reason').optional().isString(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      // Only chefs and admins can issue refunds
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

      if (payment.status !== 'succeeded') {
        throw new AppError('Can only refund successful payments', 400);
      }

      if (!payment.stripePaymentIntentId) {
        throw new AppError('Cannot refund cash payments through this endpoint', 400);
      }

      // Determine refund amount
      const refundAmount = amount 
        ? toStripeAmount(parseFloat(amount.toString()))
        : toStripeAmount(payment.totalAmount); // Full refund if no amount specified

      // Create refund with Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          refundReason: reason || 'Refund requested',
          refundedBy: req.user!.id,
        },
      });

      // Create transaction record
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

      // Update payment status
      const isFullRefund = refundAmount === toStripeAmount(payment.totalAmount);
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullRefund ? 'refunded' : payment.status,
        },
      });

      // Update order status
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

// Get Payment Configuration (returns publishable key)
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

export default router;
