import { CheckCircle, Clock, Star } from 'lucide-react';
import type { Order, OrderItem } from '../types';
import {
  formatReceiptDateTime,
  isCompletedPaidReceipt,
  itemHasReview,
} from '../lib/orderReceipt';

type OrderReceiptProps = {
  order: Order;
  onWriteReview: (orderId: string, dishId?: string) => void;
  /** When true, show a compact footer CTA if any dish is unreviewed. */
  showOrderLevelCta?: boolean;
  className?: string;
};

function LineReviewStatus({
  order,
  item,
  onWriteReview,
}: {
  order: Order;
  item: OrderItem;
  onWriteReview: (orderId: string, dishId?: string) => void;
}) {
  if (!isCompletedPaidReceipt(order)) {
    return null;
  }

  const review = item.reviews?.[0];
  if (review) {
    if (review.approved) {
      return (
        <span className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" aria-hidden />
          Reviewed
        </span>
      );
    }
    return (
      <span className="text-xs text-amber-700 flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden />
        Review pending
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onWriteReview(order.id, item.dishId)}
      className="text-xs text-primary-600 hover:underline flex items-center gap-1"
    >
      <Star className="h-3 w-3" aria-hidden />
      Leave a review
    </button>
  );
}

/**
 * Receipt-style presentation for a completed paid order with per-dish review actions.
 */
export default function OrderReceipt({
  order,
  onWriteReview,
  showOrderLevelCta = true,
  className = '',
}: OrderReceiptProps) {
  const when = formatReceiptDateTime(order.completedAt || order.createdAt);
  const total = order.finalAmount ?? order.totalPrice;
  const hasUnreviewed = order.items.some((item) => !itemHasReview(item));

  return (
    <article
      className={`bg-white border border-th-border rounded-th-lg overflow-hidden ${className}`}
      aria-label={`Receipt for order ${order.orderNumber}`}
    >
      <header className="px-5 pt-5 pb-3 border-b border-dashed border-th-border">
        <div className="flex justify-between items-start gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-th-muted-fg">Receipt</p>
            <p className="text-lg font-semibold text-gray-900">Order #{order.orderNumber}</p>
            <p className="text-sm text-gray-600 mt-0.5">{when}</p>
            {order.deliveryLocation ? (
              <p className="text-sm text-primary-700 mt-1">{order.deliveryLocation}</p>
            ) : null}
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Completed
          </span>
        </div>
      </header>

      <ul className="px-5 py-4 space-y-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900">{item.dish.name}</p>
              <p className="text-sm text-gray-500">
                {item.quantity} × ${item.priceAtOrder.toFixed(2)}
              </p>
              <div className="mt-1">
                <LineReviewStatus order={order} item={item} onWriteReview={onWriteReview} />
              </div>
            </div>
            <p className="font-semibold text-gray-900 tabular-nums shrink-0">
              ${(item.priceAtOrder * item.quantity).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>

      <footer className="px-5 pb-5 pt-3 border-t border-dashed border-th-border space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-xl font-bold text-primary-600 tabular-nums">
            ${total.toFixed(2)}
          </span>
        </div>
        {showOrderLevelCta && hasUnreviewed ? (
          <button
            type="button"
            onClick={() => onWriteReview(order.id)}
            className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <Star className="h-5 w-5" aria-hidden />
            Write a review
          </button>
        ) : null}
      </footer>
    </article>
  );
}
