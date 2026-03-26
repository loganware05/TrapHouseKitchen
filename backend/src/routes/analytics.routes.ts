import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import {
  AuthRequest,
  authenticate,
  authorize,
  optionalAuthenticate,
} from '../middleware/auth';
import {
  getChefDashboard,
  getUserSpendSummary,
  ingestEvents,
} from '../services/analytics.service';

const router = Router();

router.post(
  '/events',
  optionalAuthenticate,
  [
    body('events').isArray({ min: 1 }),
    body('events.*.event').isString().notEmpty().isLength({ max: 120 }),
    body('events.*.metadata').optional().isObject(),
    body('events.*.sessionId').optional().isString().isLength({ max: 128 }),
    body('sessionId').optional().isString().isLength({ max: 128 }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { events, sessionId: bodySessionId } = req.body as {
        events: Array<{ event: string; metadata?: object; sessionId?: string }>;
        sessionId?: string;
      };
      const headerSession = req.headers['x-session-id'];
      const defaultSessionId =
        typeof bodySessionId === 'string'
          ? bodySessionId
          : typeof headerSession === 'string'
            ? headerSession
            : undefined;

      const result = await ingestEvents(req.user?.id, defaultSessionId, events);
      res.status(201).json({ status: 'success', data: result });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/dashboard',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [query('period').optional().matches(/^(\d+d|24h|1d)$/)],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const period = (req.query.period as string) || '7d';
      const data = await getChefDashboard(period);
      res.json({ status: 'success', data });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/user-spend',
  authenticate,
  [query('period').optional().matches(/^(\d+d|24h|1d)$/)],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      if (req.user!.role !== 'CUSTOMER') {
        throw new AppError('Spend summary is only available for customers', 403);
      }
      const period = (req.query.period as string) || '7d';
      const data = await getUserSpendSummary(req.user!.id, period);
      res.json({ status: 'success', data });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
