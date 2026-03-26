import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import stripe, { fromStripeAmount } from '../lib/stripe';
import prisma from '../lib/prisma';
import { PaymentRecordStatus } from '@prisma/client';
import { setOrderStatus } from '../services/order.service';
import { finalizeCouponAfterPayment, handleSetupIntentSucceededWebhook } from '../services/payment.service';
import { sendNewOrderNotificationToChef, sendOrderConfirmationEmail } from '../services/emailService';

const router = Router();

// Stripe Webhook Handler
// NOTE: This endpoint must receive the RAW body, not JSON parsed
router.post(
  '/stripe',
  async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is required in production');
      return res.status(503).json({ error: 'Webhook signing is not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Development only: parse unsigned payload (never use in production)
        event = JSON.parse(req.body.toString());
        console.warn('⚠️  Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET)');
      }
    } catch (err: any) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      console.log(`📨 Webhook event received: ${event.type} (ID: ${event.id})`);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'setup_intent.succeeded':
          await handleSetupIntentSucceededWebhook(event.data.object as Stripe.SetupIntent);
          break;

        default:
          console.log(`⚠️  Unhandled event type: ${event.type}`);
      }

      // Return 200 to acknowledge receipt of the event
      console.log(`✅ Webhook event processed successfully: ${event.type}`);
      res.json({ received: true, eventType: event.type });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      console.error('   Event type:', event.type);
      console.error('   Event ID:', event.id);
      console.error('   Error details:', error instanceof Error ? error.stack : String(error));
      res.status(500).json({ error: 'Webhook processing failed', eventType: event.type });
    }
  }
);

// Handle successful payment
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Payment webhook received - PaymentIntent succeeded:', paymentIntent.id);
  console.log('   Amount:', paymentIntent.amount, paymentIntent.currency);
  console.log('   Metadata:', JSON.stringify(paymentIntent.metadata));

  try {
    // Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: {
        order: {
          include: {
            items: {
              include: {
                dish: true,
              },
            },
            user: true,
          },
        },
      },
    });

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Retrieve the PaymentIntent with expanded charges to get charge details
    const expandedPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ['charges.data.payment_method_details']
    });

    // Extract payment method details
    const paymentMethodDetails: any = {};
    let receiptUrl: string | null = null;
    let chargeId: string | null = null;
    
    // Type assertion for expanded charges (Stripe types don't always reflect expansions)
    const charges = (expandedPaymentIntent as any).charges as Stripe.ApiList<Stripe.Charge> | undefined;
    if (charges && charges.data && charges.data.length > 0) {
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

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentRecordStatus.SUCCEEDED,
        paymentMethodDetails,
        receiptUrl,
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        paymentId: payment.id,
        type: 'CHARGE',
        amount: fromStripeAmount(paymentIntent.amount),
        status: 'succeeded',
        stripeChargeId: chargeId,
      },
    });

    await setOrderStatus(payment.orderId, 'PENDING', {
      sendEmail: false,
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
      },
    });

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: {
        items: { include: { dish: true } },
        user: true,
      },
    });

    if (order) {
      await finalizeCouponAfterPayment(order.id, order.appliedCouponId);

      const orderDate = new Date(order.createdAt).toLocaleString();
      const emailPayload = {
        customerName: order.user.name,
        customerEmail: order.user.email || '',
        orderNumber: order.orderNumber.toString(),
        orderDate,
        items: order.items.map(item => ({
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

      sendOrderConfirmationEmail(emailPayload).catch(err =>
        console.error('Confirmation email error:', err)
      );
      sendNewOrderNotificationToChef(emailPayload).catch(err =>
        console.error('Chef notification email error:', err)
      );
    }

    console.log('✅ Payment processed successfully for order:', payment.orderId);
    console.log('   Order paymentStatus updated to: PAID');
    console.log('   Order status: PENDING');
  } catch (error) {
    console.error('❌ Error handling payment success:', error);
    console.error('   PaymentIntent ID:', paymentIntent.id);
    console.error('   Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Payment webhook received - PaymentIntent failed:', paymentIntent.id);
  console.log('   Failure reason:', paymentIntent.last_payment_error?.message || 'Unknown');

  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Extract failure reason
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentRecordStatus.FAILED,
        failureReason,
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'FAILED',
      },
    });

    console.log('Payment failure recorded for order:', payment.orderId);

    // TODO: Send notification to customer about failed payment
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    console.error('   PaymentIntent ID:', paymentIntent.id);
    console.error('   Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Handle refunded charge
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('💸 Charge refunded:', charge.id);

  try {
    // Find payment by charge ID through transactions
    const transaction = await prisma.transaction.findFirst({
      where: { stripeChargeId: charge.id },
      include: {
        payment: true,
      },
    });

    if (!transaction) {
      console.error('Transaction not found for charge:', charge.id);
      return;
    }

    // Check if this is a full or partial refund
    const totalRefunded = fromStripeAmount(charge.amount_refunded);
    const totalAmount = transaction.payment.totalAmount;
    const isFullRefund = totalRefunded >= totalAmount;

    // Update payment status
    await prisma.payment.update({
      where: { id: transaction.paymentId },
      data: {
        status: isFullRefund ? PaymentRecordStatus.REFUNDED : PaymentRecordStatus.SUCCEEDED, // Keep succeeded if partial
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: transaction.payment.orderId },
      data: {
        paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        status: isFullRefund ? 'CANCELLED' : undefined,
      },
    });

    console.log('Refund processed for payment:', transaction.paymentId);

    // TODO: Send refund confirmation to customer
  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
}

// Handle canceled payment intent
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('🚫 Payment canceled:', paymentIntent.id);

  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      console.error('Payment not found for PaymentIntent:', paymentIntent.id);
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentRecordStatus.CANCELED,
      },
    });

    console.log('Payment cancellation recorded for order:', payment.orderId);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

export default router;
