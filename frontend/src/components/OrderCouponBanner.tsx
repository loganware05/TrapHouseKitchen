import { Ticket } from 'lucide-react';
import type { Order } from '../types';
import { receiptUsedCoupon } from '../lib/orderReceipt';

type OrderCouponBannerProps = {
  order: Order;
  /** Compact single-line for dense lists */
  compact?: boolean;
  className?: string;
};

/**
 * Shows when a coupon is attached to this order (applied at checkout).
 * Shared by customer Orders and chef Order Management.
 */
export default function OrderCouponBanner({
  order,
  compact = false,
  className = '',
}: OrderCouponBannerProps) {
  const coupon = receiptUsedCoupon(order);
  if (!coupon) {
    return null;
  }

  if (compact) {
    return (
      <p
        className={`text-sm text-primary-700 flex items-center gap-1.5 ${className}`}
        data-testid={`order-coupon-${order.orderNumber}`}
      >
        <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Coupon {coupon.code}
        <span className="tabular-nums">−${coupon.discountAmount.toFixed(2)}</span>
      </p>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 ${className}`}
      data-testid={`order-coupon-${order.orderNumber}`}
    >
      <Ticket className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="font-medium">Coupon applied</p>
        <p className="text-xs mt-0.5 opacity-90">
          <span className="font-mono font-semibold">{coupon.code}</span>
          {' · '}−${coupon.discountAmount.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
