import { OrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { ORDER_LIST_VISIBLE_PAYMENT_STATUSES } from './orderVisibility';

/** Tunable via env; code defaults below. */
export const PREP_CONFIG = {
  DEFAULT_DISH_PREP: parseInt(process.env.PREP_DEFAULT_DISH_MINUTES || '15', 10),
  BASE_BUFFER: parseInt(process.env.PREP_BASE_BUFFER_MINUTES || '5', 10),
  MIN_ETA: parseInt(process.env.PREP_MIN_ETA_MINUTES || '15', 10),
  MAX_ETA: parseInt(process.env.PREP_MAX_ETA_MINUTES || '120', 10),
  QUEUE_PENDING: parseInt(process.env.PREP_QUEUE_PENDING_MINUTES || '8', 10),
  QUEUE_PREPARING: parseInt(process.env.PREP_QUEUE_PREPARING_MINUTES || '8', 10),
  QUEUE_READY: parseInt(process.env.PREP_QUEUE_READY_MINUTES || '2', 10),
};

export type QueueCounts = {
  pending: number;
  preparing: number;
  ready: number;
};

export type PrepLineItem = {
  quantity: number;
  dish: { prepTime: number | null };
};

export function queueMinutesFromCounts(counts: QueueCounts): number {
  return (
    counts.pending * PREP_CONFIG.QUEUE_PENDING +
    counts.preparing * PREP_CONFIG.QUEUE_PREPARING +
    counts.ready * PREP_CONFIG.QUEUE_READY
  );
}

export function sumDishPrepMinutes(items: PrepLineItem[]): number {
  return items.reduce((sum, item) => {
    const perDish = item.dish.prepTime ?? PREP_CONFIG.DEFAULT_DISH_PREP;
    return sum + perDish * item.quantity;
  }, 0);
}

export function computeOrderPrepMinutes(params: {
  items: PrepLineItem[];
  queueCounts: QueueCounts;
  learningBiasMinutes?: number;
}): number {
  const dishMinutes = sumDishPrepMinutes(params.items);
  const queueMinutes = queueMinutesFromCounts(params.queueCounts);
  const bias = params.learningBiasMinutes ?? 0;
  const raw = PREP_CONFIG.BASE_BUFFER + dishMinutes + queueMinutes + bias;
  return Math.min(Math.max(raw, PREP_CONFIG.MIN_ETA), PREP_CONFIG.MAX_ETA);
}

const KITCHEN_QUEUE_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'READY'];

export async function getKitchenQueueCounts(excludeOrderId?: string): Promise<QueueCounts> {
  const groups = await prisma.order.groupBy({
    by: ['status'],
    where: {
      paymentStatus: { in: ORDER_LIST_VISIBLE_PAYMENT_STATUSES },
      isArchived: false,
      status: { in: KITCHEN_QUEUE_STATUSES },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    _count: { _all: true },
  });

  const counts: QueueCounts = { pending: 0, preparing: 0, ready: 0 };
  for (const row of groups) {
    if (row.status === 'PENDING') counts.pending = row._count._all;
    if (row.status === 'PREPARING') counts.preparing = row._count._all;
    if (row.status === 'READY') counts.ready = row._count._all;
  }
  return counts;
}

/** @deprecated Legacy formula — kept for tests referencing old behavior only. */
export function legacyPrepTimeFromItemCount(itemCount: number): number {
  return 15 + itemCount * 5;
}
