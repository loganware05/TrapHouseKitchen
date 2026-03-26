import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import {
  buildBudgetMeal,
  recordComboSelection,
} from '../services/ai.service';

const router = Router();

router.post(
  '/build-meal',
  authenticate,
  authorize('CUSTOMER'),
  [body('budget').isFloat({ min: 5, max: 100 })],
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Budget must be a number between 5 and 100', 400);
      }

      const budget = Number(req.body.budget);
      const { combinations, interactionId } = await buildBudgetMeal(req.user!.id, budget);

      res.json({
        status: 'success',
        data: { combinations, interactionId },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  '/interactions/:id/selection',
  authenticate,
  authorize('CUSTOMER'),
  [
    param('id').isUUID(),
    body('selectedComboIndex').isInt({ min: 0, max: 10 }),
  ],
  async (req: AuthRequest, res: Response, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid interaction or selection index', 400);
      }

      await recordComboSelection(
        req.user!.id,
        req.params.id,
        req.body.selectedComboIndex as number
      );

      res.json({ status: 'success', data: null });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
