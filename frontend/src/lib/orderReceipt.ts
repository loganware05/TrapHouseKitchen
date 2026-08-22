import type { Order, OrderItem } from '../types';

/** Default review eligibility window (matches backend REVIEW_WINDOW_DAYS). */
export const REVIEW_WINDOW_DAYS = 30;

export function isCompletedPaidReceipt(order: Order): boolean {
  return order.status === 'COMPLETED' && order.paymentStatus === 'PAID';
}

export function isWithinReviewWindow(
  order: Order,
  now = new Date(),
  windowDays = REVIEW_WINDOW_DAYS
): boolean {
  const completedAt = order.completedAt ? new Date(order.completedAt) : null;
  if (!completedAt || Number.isNaN(completedAt.getTime())) {
    return false;
  }
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  return completedAt >= cutoff;
}

/** Receipts that can still show leave-review CTAs (or already-reviewed status). */
export function isReviewableReceipt(order: Order, now = new Date()): boolean {
  return isCompletedPaidReceipt(order) && isWithinReviewWindow(order, now);
}

export function itemHasReview(item: OrderItem): boolean {
  return (item.reviews?.length ?? 0) > 0;
}

export function receiptHasUnreviewedDishes(order: Order): boolean {
  return order.items.some((item) => !itemHasReview(item));
}

/** Newest completed+paid receipts first, capped for Profile. */
export function selectRecentReceipts(orders: Order[], limit = 5, now = new Date()): Order[] {
  return orders
    .filter((order) => isCompletedPaidReceipt(order) && isWithinReviewWindow(order, now))
    .sort((a, b) => {
      const aTime = new Date(a.completedAt || a.createdAt).getTime();
      const bTime = new Date(b.completedAt || b.createdAt).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatReceiptDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatReceiptDate(iso)} · ${d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
