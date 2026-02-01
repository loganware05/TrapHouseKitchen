import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import stripe, { fromStripeAmount } from '../lib/stripe';
import prisma from '../lib/prisma';

const router = Router();

// Stripe Webhook Handler
// NOTE: This endpoint must receive the RAW body, not JSON parsed
router.post(
  '/stripe',
  async (req: Request, res: Response) => {
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
        // In development, if no webhook secret is set, parse the body directly
        // NOTE: This should NOT be used in production
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
        status: 'succeeded',
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

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'PENDING', // Set to PENDING so chef can start preparing
        paymentStatus: 'PAID',
      },
    });

    console.log('✅ Payment processed successfully for order:', payment.orderId);
    console.log('   Order paymentStatus updated to:', updatedOrder.paymentStatus);
    console.log('   Order status:', updatedOrder.status);

    // TODO: Send notification to chef
    // TODO: Send confirmation email to customer
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
        status: 'failed',
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
        status: isFullRefund ? 'refunded' : 'succeeded', // Keep as succeeded if partial
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
        status: 'canceled',
      },
    });

    console.log('Payment cancellation recorded for order:', payment.orderId);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

export default router;
