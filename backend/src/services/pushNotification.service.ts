import webpush from 'web-push';
import { OrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

/** Statuses that trigger customer Web Push (Captain Slice 15). */
export const PUSH_NOTIFY_STATUSES: readonly OrderStatus[] = [
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
] as const;

export function shouldSendOrderStatusPush(status: OrderStatus): boolean {
  return (PUSH_NOTIFY_STATUSES as readonly string[]).includes(status);
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
};

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:ops@traphousekitchen.com';
  if (!publicKey || !privateKey) {
    return null;
  }
  return { publicKey, privateKey, subject };
}

let vapidConfigured = false;

function ensureWebPushConfigured(): boolean {
  const config = getVapidConfig();
  if (!config) {
    return false;
  }
  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null;
}

export function isPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

function assertValidSubscriptionInput(input: PushSubscriptionInput) {
  if (!input.endpoint || typeof input.endpoint !== 'string') {
    throw new AppError('Push subscription endpoint is required', 400);
  }
  if (!input.keys?.p256dh || !input.keys?.auth) {
    throw new AppError('Push subscription keys (p256dh, auth) are required', 400);
  }
  try {
    // Basic URL sanity — reject non-http(s) endpoints
    const url = new URL(input.endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new AppError('Invalid push subscription endpoint', 400);
  }
}

/**
 * Upsert a browser push subscription for the authenticated user.
 * If the endpoint was previously owned by another user (device re-login),
 * reassign ownership to the current user.
 */
export async function upsertPushSubscription(userId: string, input: PushSubscriptionInput) {
  assertValidSubscriptionInput(input);

  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
  });
}

/** Remove a subscription only if it belongs to the given user. */
export async function deletePushSubscriptionForUser(userId: string, endpoint: string) {
  if (!endpoint) {
    throw new AppError('endpoint is required', 400);
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
  });

  if (!existing) {
    return { deleted: false };
  }

  if (existing.userId !== userId) {
    throw new AppError('Not authorized to remove this subscription', 403);
  }

  await prisma.pushSubscription.delete({ where: { endpoint } });
  return { deleted: true };
}

/** Remove all subscriptions for a user (logout / revoke). */
export async function deleteAllPushSubscriptionsForUser(userId: string) {
  const result = await prisma.pushSubscription.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

export async function listPushSubscriptionsForUser(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function orderStatusPushCopy(status: OrderStatus, orderNumber: number | string) {
  const num = String(orderNumber);
  switch (status) {
    case 'PREPARING':
      return {
        title: 'TrapHouse Kitchen',
        body: `Order #${num} is being prepared`,
      };
    case 'READY':
      return {
        title: 'TrapHouse Kitchen',
        body: `Order #${num} is ready`,
      };
    case 'OUT_FOR_DELIVERY':
      return {
        title: 'TrapHouse Kitchen',
        body: `Order #${num} is out for delivery`,
      };
    default:
      return {
        title: 'TrapHouse Kitchen',
        body: `Order #${num} updated`,
      };
  }
}

export type SendPushResult = {
  attempted: number;
  sent: number;
  removed: number;
  skipped: boolean;
  reason?: string;
};

/**
 * Send Web Push to all subscriptions for the order's customer.
 * No-ops for non-notify statuses and when VAPID is not configured.
 * Gone/expired endpoints (410/404) are deleted.
 */
export async function sendOrderStatusPush(params: {
  userId: string;
  orderId: string;
  orderNumber: number | string;
  status: OrderStatus;
}): Promise<SendPushResult> {
  if (!shouldSendOrderStatusPush(params.status)) {
    return { attempted: 0, sent: 0, removed: 0, skipped: true, reason: 'status_not_notifiable' };
  }

  if (!ensureWebPushConfigured()) {
    return { attempted: 0, sent: 0, removed: 0, skipped: true, reason: 'vapid_not_configured' };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: params.userId },
  });

  if (subscriptions.length === 0) {
    return { attempted: 0, sent: 0, removed: 0, skipped: true, reason: 'no_subscriptions' };
  }

  const copy = orderStatusPushCopy(params.status, params.orderNumber);
  const payload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    data: {
      url: `/orders/${params.orderId}`,
      orderId: params.orderId,
      status: params.status,
    },
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          removed += 1;
        } else {
          console.error('Web push send error:', err);
        }
      }
    })
  );

  return {
    attempted: subscriptions.length,
    sent,
    removed,
    skipped: false,
  };
}
