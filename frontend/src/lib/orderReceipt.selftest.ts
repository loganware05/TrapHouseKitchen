/**
 * Self-test for order receipt helpers. Run: npx tsx src/lib/orderReceipt.selftest.ts
 */
import {
  isCompletedPaidReceipt,
  isWithinReviewWindow,
  receiptHasUnreviewedDishes,
  selectRecentReceipts,
} from './orderReceipt';
import type { Order, OrderItem } from '../types';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    throw new Error(msg);
  }
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  const item: OrderItem = {
    id: 'oi1',
    orderId: 'o1',
    dishId: 'd1',
    quantity: 1,
    priceAtOrder: 10,
    dish: { id: 'd1', name: 'Test Dish' } as OrderItem['dish'],
    reviews: [],
  };
  return {
    id: 'o1',
    orderNumber: 1001,
    userId: 'u1',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    totalPrice: 10,
    tipAmount: 0,
    finalAmount: 10,
    createdAt: '2026-08-01T12:00:00.000Z',
    completedAt: '2026-08-10T12:00:00.000Z',
    items: [item],
    ...overrides,
  } as Order;
}

const now = new Date('2026-08-21T12:00:00.000Z');

assert(isCompletedPaidReceipt(baseOrder()), 'completed+paid is receipt');
assert(
  !isCompletedPaidReceipt(baseOrder({ status: 'PREPARING' })),
  'preparing is not receipt'
);
assert(
  isWithinReviewWindow(baseOrder({ completedAt: '2026-08-10T12:00:00.000Z' }), now),
  '11 days ago is in window'
);
assert(
  !isWithinReviewWindow(baseOrder({ completedAt: '2026-07-01T12:00:00.000Z' }), now),
  '51 days ago is out of window'
);
assert(receiptHasUnreviewedDishes(baseOrder()), 'unreviewed dishes detected');
assert(
  !receiptHasUnreviewedDishes(
    baseOrder({
      items: [
        {
          ...baseOrder().items[0],
          reviews: [{ id: 'r1', approved: false } as NonNullable<OrderItem['reviews']>[number]],
        },
      ],
    })
  ),
  'reviewed dishes hide leave-review need'
);

const recent = selectRecentReceipts(
  [
    baseOrder({ id: 'old', completedAt: '2026-08-01T12:00:00.000Z', orderNumber: 1 }),
    baseOrder({ id: 'new', completedAt: '2026-08-20T12:00:00.000Z', orderNumber: 2 }),
    baseOrder({ id: 'prep', status: 'PREPARING', paymentStatus: 'PAID' }),
  ],
  5,
  now
);
assert(recent.length === 2, 'selects two completed receipts');
assert(recent[0].id === 'new', 'newest first');

console.log('orderReceipt.selftest: ok');
