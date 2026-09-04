import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma', () => ({
  default: {
    pushSubscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import webpush from 'web-push';
import prisma from '../../src/lib/prisma';
import {
  shouldSendOrderStatusPush,
  orderStatusPushCopy,
  sendOrderStatusPush,
  deletePushSubscriptionForUser,
  upsertPushSubscription,
} from '../../src/services/pushNotification.service';

describe('pushNotification.service', () => {
  const prevPublic = process.env.VAPID_PUBLIC_KEY;
  const prevPrivate = process.env.VAPID_PRIVATE_KEY;
  const prevSubject = process.env.VAPID_SUBJECT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  });

  afterEach(() => {
    process.env.VAPID_PUBLIC_KEY = prevPublic;
    process.env.VAPID_PRIVATE_KEY = prevPrivate;
    process.env.VAPID_SUBJECT = prevSubject;
  });

  describe('shouldSendOrderStatusPush', () => {
    it('notifies Preparing, Ready, and Out for delivery only', () => {
      expect(shouldSendOrderStatusPush('PREPARING')).toBe(true);
      expect(shouldSendOrderStatusPush('READY')).toBe(true);
      expect(shouldSendOrderStatusPush('OUT_FOR_DELIVERY')).toBe(true);
      expect(shouldSendOrderStatusPush('PENDING')).toBe(false);
      expect(shouldSendOrderStatusPush('COMPLETED')).toBe(false);
      expect(shouldSendOrderStatusPush('CANCELLED')).toBe(false);
    });
  });

  describe('orderStatusPushCopy', () => {
    it('includes order number in body', () => {
      expect(orderStatusPushCopy('PREPARING', 42).body).toContain('#42');
      expect(orderStatusPushCopy('READY', 42).body.toLowerCase()).toContain('ready');
      expect(orderStatusPushCopy('OUT_FOR_DELIVERY', 42).body.toLowerCase()).toContain('delivery');
    });
  });

  describe('sendOrderStatusPush', () => {
    it('skips non-notifiable statuses without reading subscriptions', async () => {
      const result = await sendOrderStatusPush({
        userId: 'u1',
        orderId: 'o1',
        orderNumber: 1,
        status: 'COMPLETED',
      });
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('status_not_notifiable');
      expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('skips when VAPID is not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      const result = await sendOrderStatusPush({
        userId: 'u1',
        orderId: 'o1',
        orderNumber: 1,
        status: 'PREPARING',
      });
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('vapid_not_configured');
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('sends to each subscription for PREPARING', async () => {
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 's1',
          userId: 'u1',
          endpoint: 'https://push.example/1',
          p256dh: 'p',
          auth: 'a',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 's2',
          userId: 'u1',
          endpoint: 'https://push.example/2',
          p256dh: 'p2',
          auth: 'a2',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

      const result = await sendOrderStatusPush({
        userId: 'u1',
        orderId: 'o1',
        orderNumber: 7,
        status: 'PREPARING',
      });

      expect(result.skipped).toBe(false);
      expect(result.attempted).toBe(2);
      expect(result.sent).toBe(2);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      const payload = JSON.parse(
        String(vi.mocked(webpush.sendNotification).mock.calls[0][1])
      );
      expect(payload.body).toContain('#7');
      expect(payload.data.orderId).toBe('o1');
    });

    it('removes gone subscriptions (410)', async () => {
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValueOnce([
        {
          id: 's1',
          userId: 'u1',
          endpoint: 'https://push.example/gone',
          p256dh: 'p',
          auth: 'a',
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      const gone = Object.assign(new Error('Gone'), { statusCode: 410 });
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(gone);
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValueOnce({} as any);

      const result = await sendOrderStatusPush({
        userId: 'u1',
        orderId: 'o1',
        orderNumber: 1,
        status: 'READY',
      });

      expect(result.sent).toBe(0);
      expect(result.removed).toBe(1);
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
  });

  describe('subscription ownership', () => {
    it('rejects delete when endpoint belongs to another user', async () => {
      vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValueOnce({
        id: 's1',
        userId: 'owner',
        endpoint: 'https://push.example/x',
        p256dh: 'p',
        auth: 'a',
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        deletePushSubscriptionForUser('intruder', 'https://push.example/x')
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
    });

    it('reassigns endpoint ownership on upsert', async () => {
      vi.mocked(prisma.pushSubscription.upsert).mockResolvedValueOnce({
        id: 's1',
        userId: 'new-owner',
        endpoint: 'https://push.example/x',
        p256dh: 'p',
        auth: 'a',
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await upsertPushSubscription('new-owner', {
        endpoint: 'https://push.example/x',
        keys: { p256dh: 'p', auth: 'a' },
      });

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: 'https://push.example/x' },
          create: expect.objectContaining({ userId: 'new-owner' }),
          update: expect.objectContaining({ userId: 'new-owner' }),
        })
      );
    });
  });
});
