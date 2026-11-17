import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getKitchenOpsRow,
  getKitchenStatus,
  updateKitchenOps,
} from '../services/kitchenOps.service';

const router = Router();

router.get('/status', async (_req, res: Response, next) => {
  try {
    const status = await getKitchenStatus();
    res.json({ status: 'success', data: status });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/ops',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (_req: AuthRequest, res: Response, next) => {
    try {
      const ops = await getKitchenOpsRow();
      const status = await getKitchenStatus();
      res.json({
        status: 'success',
        data: {
          ops: {
            id: ops.id,
            acceptingOrders: ops.acceptingOrders,
            scheduleEnabled: ops.scheduleEnabled,
            weeklyHours: ops.weeklyHours,
            maxConcurrentKitchenOrders: ops.maxConcurrentKitchenOrders,
            updatedAt: ops.updatedAt,
          },
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/ops',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [
    body('acceptingOrders').optional().isBoolean(),
    body('scheduleEnabled').optional().isBoolean(),
    body('weeklyHours').optional(),
    body('maxConcurrentKitchenOrders')
      .optional({ nullable: true })
      .custom((v) => v === null || (Number.isInteger(v) && v >= 1)),
  ],
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const ops = await updateKitchenOps({
        acceptingOrders: req.body.acceptingOrders,
        scheduleEnabled: req.body.scheduleEnabled,
        weeklyHours: req.body.weeklyHours,
        maxConcurrentKitchenOrders: req.body.maxConcurrentKitchenOrders,
      });
      const status = await getKitchenStatus();

      res.json({
        status: 'success',
        data: {
          ops: {
            id: ops.id,
            acceptingOrders: ops.acceptingOrders,
            scheduleEnabled: ops.scheduleEnabled,
            weeklyHours: ops.weeklyHours,
            maxConcurrentKitchenOrders: ops.maxConcurrentKitchenOrders,
            updatedAt: ops.updatedAt,
          },
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
