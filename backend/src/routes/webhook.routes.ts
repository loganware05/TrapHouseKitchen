import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import stripe from '../lib/stripe';
import prisma from '../lib/prisma';
import { PaymentRecordStatus } from '@prisma/client';
import { setOrderStatus } from '../services/order.service';
import { handleSetupIntentSucceededWebhook } from '../services/payment.service';
import {
  finalizeChargeRefunded,
  finalizeFailedPayment,
  finalizeSuccessfulPayment,
} from '../services/paymentFinalization.service';

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
    const result = await finalizeSuccessfulPayment(paymentIntent, { sendEmails: true });
    if (result.applied) {
      console.log('✅ Payment processed successfully for order:', result.orderId);
      console.log('   Order paymentStatus updated to: PAID');
    }
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
    const result = await finalizeFailedPayment(paymentIntent);
    if (result.applied) {
      console.log('Payment failure recorded for order:', result.orderId);
    }
  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
    console.error('   PaymentIntent ID:', paymentIntent.id);
    console.error('   Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Handle refunded charge (idempotent; customer refund email deferred — Slice 17)
async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('💸 Charge refunded:', charge.id);

  try {
    const result = await finalizeChargeRefunded(charge);
    if (result.applied) {
      console.log(
        'Refund processed for order:',
        result.orderId,
        result.isFullRefund ? '(full)' : '(partial)'
      );
    }
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

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { paymentStatus: true, status: true },
    });

    if (order && order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED') {
      await setOrderStatus(payment.orderId, 'CANCELLED', { sendEmail: false });
    }

    console.log('Payment cancellation recorded for order:', payment.orderId);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

export default router;
