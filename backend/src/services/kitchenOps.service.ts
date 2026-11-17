import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { ORDER_LIST_VISIBLE_PAYMENT_STATUSES } from './orderVisibility';

export const KITCHEN_OPS_ID = 'default';
export const KITCHEN_TIMEZONE = 'America/Chicago';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof DAY_KEYS)[number];

export type DayHours = { open: string; close: string };
export type WeeklyHours = Partial<Record<WeekdayKey, DayHours | null>>;

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const KITCHEN_ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
];

export type KitchenClosedReason =
  | 'paused'
  | 'outside_hours'
  | 'at_capacity'
  | null;

export type KitchenStatus = {
  acceptingOrders: boolean;
  scheduleEnabled: boolean;
  openNow: boolean;
  reason: KitchenClosedReason;
  timezone: string;
  weeklyHours: WeeklyHours | null;
  maxConcurrentKitchenOrders: number | null;
  currentKitchenOrders: number;
};

function minutesFromHhMm(value: string): number {
  const m = HH_MM.exec(value);
  if (!m) {
    throw new AppError(`Invalid time "${value}" (expected HH:mm)`, 400);
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

export function validateWeeklyHours(input: unknown): WeeklyHours | null {
  if (input == null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('weeklyHours must be an object', 400);
  }
  const out: WeeklyHours = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!DAY_KEYS.includes(key as WeekdayKey)) {
      throw new AppError(`Unknown weekday key "${key}"`, 400);
    }
    if (value == null) {
      out[key as WeekdayKey] = null;
      continue;
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new AppError(`weeklyHours.${key} must be { open, close } or null`, 400);
    }
    const open = (value as { open?: unknown }).open;
    const close = (value as { close?: unknown }).close;
    if (typeof open !== 'string' || typeof close !== 'string') {
      throw new AppError(`weeklyHours.${key} requires open and close as HH:mm`, 400);
    }
    minutesFromHhMm(open);
    minutesFromHhMm(close);
    out[key as WeekdayKey] = { open, close };
  }
  return out;
}

/** Chicago local weekday + minutes since midnight. */
export function getChicagoClock(now = new Date()): { day: WeekdayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: KITCHEN_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const map: Record<string, WeekdayKey> = {
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
  };
  return { day: map[weekday] ?? 'mon', minutes: hour * 60 + minute };
}

export function isWithinDayHours(hours: DayHours, minutes: number): boolean {
  const open = minutesFromHhMm(hours.open);
  const close = minutesFromHhMm(hours.close);
  if (open === close) return false;
  if (close > open) {
    return minutes >= open && minutes < close;
  }
  // Overnight window (e.g. 17:00 → 02:00)
  return minutes >= open || minutes < close;
}

export function isWithinWeeklySchedule(
  weeklyHours: WeeklyHours | null | undefined,
  now = new Date()
): boolean {
  if (!weeklyHours) return false;
  const { day, minutes } = getChicagoClock(now);
  const hours = weeklyHours[day];
  if (!hours) return false;
  return isWithinDayHours(hours, minutes);
}

async function ensureKitchenOps() {
  return prisma.kitchenOps.upsert({
    where: { id: KITCHEN_OPS_ID },
    create: { id: KITCHEN_OPS_ID },
    update: {},
  });
}

export async function countKitchenOrders(): Promise<number> {
  return prisma.order.count({
    where: {
      status: { in: KITCHEN_ACTIVE_STATUSES },
      paymentStatus: { in: ORDER_LIST_VISIBLE_PAYMENT_STATUSES as PaymentStatus[] },
      isArchived: false,
    },
  });
}

export async function getKitchenOpsRow() {
  return ensureKitchenOps();
}

export async function getKitchenStatus(now = new Date()): Promise<KitchenStatus> {
  const ops = await ensureKitchenOps();
  const weeklyHours = (ops.weeklyHours as WeeklyHours | null) ?? null;
  const currentKitchenOrders = await countKitchenOrders();

  let reason: KitchenClosedReason = null;
  let openNow = true;

  if (!ops.acceptingOrders) {
    openNow = false;
    reason = 'paused';
  } else if (ops.scheduleEnabled && !isWithinWeeklySchedule(weeklyHours, now)) {
    openNow = false;
    reason = 'outside_hours';
  } else if (
    ops.maxConcurrentKitchenOrders != null &&
    currentKitchenOrders >= ops.maxConcurrentKitchenOrders
  ) {
    openNow = false;
    reason = 'at_capacity';
  }

  return {
    acceptingOrders: ops.acceptingOrders,
    scheduleEnabled: ops.scheduleEnabled,
    openNow,
    reason,
    timezone: KITCHEN_TIMEZONE,
    weeklyHours,
    maxConcurrentKitchenOrders: ops.maxConcurrentKitchenOrders,
    currentKitchenOrders,
  };
}

const CLOSED_MESSAGES: Record<Exclude<KitchenClosedReason, null>, string> = {
  paused: 'The kitchen is not accepting orders right now.',
  outside_hours: 'The kitchen is closed outside service hours.',
  at_capacity: 'The kitchen is at capacity. Please try again shortly.',
};

export async function assertKitchenAcceptingOrders(now = new Date()): Promise<void> {
  const status = await getKitchenStatus(now);
  if (status.openNow) return;
  throw new AppError(
    CLOSED_MESSAGES[status.reason ?? 'paused'],
    403
  );
}

export async function updateKitchenOps(params: {
  acceptingOrders?: boolean;
  scheduleEnabled?: boolean;
  weeklyHours?: unknown;
  maxConcurrentKitchenOrders?: number | null;
}) {
  await ensureKitchenOps();
  const data: Prisma.KitchenOpsUpdateInput = {};

  if (params.acceptingOrders !== undefined) {
    data.acceptingOrders = params.acceptingOrders;
  }
  if (params.scheduleEnabled !== undefined) {
    data.scheduleEnabled = params.scheduleEnabled;
  }
  if (params.weeklyHours !== undefined) {
    const validated = validateWeeklyHours(params.weeklyHours);
    data.weeklyHours = validated === null ? Prisma.JsonNull : validated;
  }
  if (params.maxConcurrentKitchenOrders !== undefined) {
    if (
      params.maxConcurrentKitchenOrders != null &&
      (!Number.isInteger(params.maxConcurrentKitchenOrders) ||
        params.maxConcurrentKitchenOrders < 1)
    ) {
      throw new AppError('maxConcurrentKitchenOrders must be a positive integer or null', 400);
    }
    data.maxConcurrentKitchenOrders = params.maxConcurrentKitchenOrders;
  }

  return prisma.kitchenOps.update({
    where: { id: KITCHEN_OPS_ID },
    data,
  });
}

/**
 * Decrement remaining servings for paid order items. Call inside a transaction
 * after first-time PAID transition. Uses row locks + conditional updates.
 */
export async function decrementRemainingServingsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { dishId: true, quantity: true },
  });

  for (const item of items) {
    await tx.$executeRaw`
      SELECT id FROM "Dish" WHERE id = ${item.dishId} FOR UPDATE
    `;
    const dish = await tx.dish.findUnique({
      where: { id: item.dishId },
      select: { remainingServings: true, status: true },
    });
    if (!dish || dish.remainingServings == null) continue;

    const next = Math.max(0, dish.remainingServings - item.quantity);
    await tx.dish.update({
      where: { id: item.dishId },
      data: {
        remainingServings: next,
        ...(next === 0 ? { status: 'UNAVAILABLE' as const } : {}),
      },
    });
  }
}
