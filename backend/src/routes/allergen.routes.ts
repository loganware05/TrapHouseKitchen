import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all allergens
router.get('/', async (_req, res, next) => {
  try {
    const allergens = await prisma.allergen.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      status: 'success',
      data: { allergens },
    });
  } catch (error) {
    next(error);
  }
});

// Create allergen (chef only)
router.post(
  '/',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [
    body('name').trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { name, description, severity } = req.body;

      const allergen = await prisma.allergen.create({
        data: {
          name,
          description,
          severity: severity || 'MODERATE',
        },
      });

      res.status(201).json({
        status: 'success',
        data: { allergen },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update allergen (chef only)
router.put(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const { name, description, severity } = req.body;

      const allergen = await prisma.allergen.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(severity && { severity }),
        },
      });

      res.json({
        status: 'success',
        data: { allergen },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete allergen (chef only)
router.delete(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.allergen.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

