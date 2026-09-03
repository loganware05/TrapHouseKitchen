/**
 * Shared Stripe mock for integration tests. Import this file before importing `app`.
 */
import { vi } from 'vitest';
import { PaymentRecordStatus } from '@prisma/client';
import type Stripe from 'stripe';

const STATUS_MAP: Record<Stripe.PaymentIntent.Status, PaymentRecordStatus> = {
  requires_payment_method: PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
  requires_confirmation: PaymentRecordStatus.REQUIRES_CONFIRMATION,
  requires_action: PaymentRecordStatus.REQUIRES_ACTION,
  processing: PaymentRecordStatus.PROCESSING,
  requires_capture: PaymentRecordStatus.REQUIRES_CAPTURE,
  canceled: PaymentRecordStatus.CANCELED,
  succeeded: PaymentRecordStatus.SUCCEEDED,
};

const g = globalThis as typeof globalThis & {
  __stripeTestFns?: {
    paymentIntentsCreate: ReturnType<typeof vi.fn>;
    paymentIntentsRetrieve: ReturnType<typeof vi.fn>;
    paymentIntentsCancel: ReturnType<typeof vi.fn>;
  };
};

if (!g.__stripeTestFns) {
  g.__stripeTestFns = {
    paymentIntentsCreate: vi.fn(),
    paymentIntentsRetrieve: vi.fn(),
    paymentIntentsCancel: vi.fn(),
  };
}

export const stripeTestFns = g.__stripeTestFns;

vi.mock('../../src/lib/stripe', () => ({
  __esModule: true,
  default: {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test_integration' }),
    },
    paymentIntents: {
      create: (...args: unknown[]) => stripeTestFns.paymentIntentsCreate(...args),
      retrieve: (...args: unknown[]) => stripeTestFns.paymentIntentsRetrieve(...args),
      cancel: (...args: unknown[]) => stripeTestFns.paymentIntentsCancel(...args),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    setupIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'seti_mock',
        client_secret: 'seti_mock_secret',
        status: 'requires_payment_method',
      }),
    },
    paymentMethods: {
      retrieve: vi.fn().mockResolvedValue({
        type: 'card',
        card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2034 },
        customer: null,
      }),
      attach: vi.fn().mockResolvedValue({}),
      detach: vi.fn().mockResolvedValue({}),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({ id: 're_mock', status: 'succeeded' }),
    },
  },
  toStripeAmount: (n: number) => Math.round(n * 100),
  fromStripeAmount: (n: number) => n / 100,
  calculatePrepTime: (itemCount: number) => 15 + 5 * itemCount,
  paymentIntentStatusToRecordStatus: (status: Stripe.PaymentIntent.Status) =>
    STATUS_MAP[status] ?? PaymentRecordStatus.REQUIRES_PAYMENT_METHOD,
}));
