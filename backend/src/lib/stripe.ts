import Stripe from 'stripe';
import { PaymentRecordStatus } from '@prisma/client';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

function stripeKeyMode(key: string, kind: 'secret' | 'publishable'): 'test' | 'live' | 'unknown' {
  if (kind === 'secret') {
    if (key.startsWith('sk_test')) return 'test';
    if (key.startsWith('sk_live')) return 'live';
  } else {
    if (key.startsWith('pk_test')) return 'test';
    if (key.startsWith('pk_live')) return 'live';
  }
  return 'unknown';
}

const secretMode = stripeKeyMode(stripeSecretKey, 'secret');
const publishableMode = stripePublishableKey
  ? stripeKeyMode(stripePublishableKey, 'publishable')
  : 'unknown';

if (stripePublishableKey && secretMode !== 'unknown' && publishableMode !== 'unknown' && secretMode !== publishableMode) {
  console.error(
    `[stripe] MODE MISMATCH: STRIPE_SECRET_KEY is ${secretMode} but STRIPE_PUBLISHABLE_KEY is ${publishableMode}. ` +
      'Payment Element will fail until both keys are test or both are live from the same Stripe account.'
  );
}

// Initialize Stripe with the secret key
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

export default stripe;

import { legacyPrepTimeFromItemCount } from '../services/prepTime.service';

/** @deprecated Use prepTime.service dynamic formula at checkout. Kept for backward compatibility. */
export const calculatePrepTime = legacyPrepTimeFromItemCount;

// Helper function to format currency amount for Stripe
// Stripe requires amounts in cents
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100);
};

// Helper function to convert Stripe amount to dollars
export const fromStripeAmount = (amount: number): number => {
  return amount / 100;
};

/** Maps Stripe PaymentIntent.status (snake_case) to our Prisma PaymentRecordStatus (DB uses @map snake_case; client enums are SCREAMING_CASE). */
const STRIPE_PI_STATUS_TO_RECORD: Record<Stripe.PaymentIntent.Status, PaymentRecordStatus> = {
  requires_payment_method: PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
  requires_confirmation: PaymentRecordStatus.REQUIRES_CONFIRMATION,
  requires_action: PaymentRecordStatus.REQUIRES_ACTION,
  processing: PaymentRecordStatus.PROCESSING,
  requires_capture: PaymentRecordStatus.REQUIRES_CAPTURE,
  canceled: PaymentRecordStatus.CANCELED,
  succeeded: PaymentRecordStatus.SUCCEEDED,
};

export function paymentIntentStatusToRecordStatus(
  status: Stripe.PaymentIntent.Status
): PaymentRecordStatus {
  return STRIPE_PI_STATUS_TO_RECORD[status];
}
