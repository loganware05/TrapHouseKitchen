import { OrderStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

/** Happy-path forward transitions (Chef status machine). */
const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'COMPLETED',
};

/**
 * Validates Chef / API status changes.
 * Allows same-status no-ops, linear forward steps, and CANCELLED from any non-cancelled status.
 */
export function assertValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): void {
  if (from === to) {
    return;
  }

  if (to === 'CANCELLED') {
    if (from === 'CANCELLED') {
      throw new AppError('Order is already cancelled', 400);
    }
    return;
  }

  if (FORWARD[from] === to) {
    return;
  }

  throw new AppError(
    `Invalid status transition from ${from} to ${to}`,
    400
  );
}

export function nextOrderStatus(from: OrderStatus): OrderStatus | null {
  return FORWARD[from] ?? null;
}
