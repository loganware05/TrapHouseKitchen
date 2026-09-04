import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import {
  deleteAllPushSubscriptionsForUser,
  deletePushSubscriptionForUser,
  getVapidPublicKey,
  isPushConfigured,
  listPushSubscriptionsForUser,
  upsertPushSubscription,
} from '../services/pushNotification.service';

const router = Router();

/** Public VAPID key for browser PushManager.subscribe (auth required to avoid drive-by scrapers). */
router.get('/vapid-public-key', authenticate, async (_req: AuthRequest, res: Response, next) => {
  try {
    const publicKey = getVapidPublicKey();
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      status: 'success',
      data: {
        publicKey,
        configured: isPushConfigured(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/** List current user's push subscriptions (no cross-user leak). */
router.get('/subscriptions', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const subscriptions = await listPushSubscriptionsForUser(req.user!.id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      status: 'success',
      data: {
        subscriptions,
        enabled: subscriptions.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/subscribe',
  authenticate,
  [
    body('endpoint').isString().notEmpty(),
    body('keys.p256dh').isString().notEmpty(),
    body('keys.auth').isString().notEmpty(),
    body('userAgent').optional({ nullable: true }).isString(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      if (!isPushConfigured()) {
        throw new AppError('Web push is not configured on this server', 503);
      }

      const subscription = await upsertPushSubscription(req.user!.id, {
        endpoint: req.body.endpoint,
        keys: {
          p256dh: req.body.keys.p256dh,
          auth: req.body.keys.auth,
        },
        userAgent: req.body.userAgent ?? req.get('user-agent') ?? null,
      });

      res.setHeader('Cache-Control', 'private, no-store');
      res.status(201).json({
        status: 'success',
        data: {
          subscription: {
            id: subscription.id,
            endpoint: subscription.endpoint,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/unsubscribe',
  authenticate,
  [body('endpoint').optional().isString(), body('all').optional().isBoolean()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const unsubscribeAll = req.body.all === true;
      if (unsubscribeAll) {
        const result = await deleteAllPushSubscriptionsForUser(req.user!.id);
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
          status: 'success',
          data: result,
        });
      }

      if (!req.body.endpoint) {
        throw new AppError('Provide endpoint or all: true', 400);
      }

      const result = await deletePushSubscriptionForUser(req.user!.id, req.body.endpoint);
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
