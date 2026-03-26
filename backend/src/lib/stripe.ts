import Stripe from 'stripe';
import { PaymentRecordStatus } from '@prisma/client';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

export default stripe;

// Helper function to calculate prep time based on order items
export const calculatePrepTime = (itemCount: number): number => {
  // Base time: 15 minutes
  // Add 5 minutes per item
  const baseTime = 15;
  const timePerItem = 5;
  return baseTime + (itemCount * timePerItem);
};

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
