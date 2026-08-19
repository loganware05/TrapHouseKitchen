import type { PaymentStatus } from '@prisma/client';

/** Payment statuses shown in customer and chef order lists (paid or post-payment states only). */
export const ORDER_LIST_VISIBLE_PAYMENT_STATUSES: PaymentStatus[] = [
  'PAID',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

export const ABANDONED_ORDER_PAYMENT_STATUSES: PaymentStatus[] = ['UNPAID', 'PENDING'];

/** Default: cancel unpaid checkout orders after 30 minutes. */
export const ABANDONED_ORDER_MAX_AGE_MS = 30 * 60 * 1000;
