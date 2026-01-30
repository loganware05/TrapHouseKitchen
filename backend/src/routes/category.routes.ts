import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all categories
router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        _count: {
          select: { dishes: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

// Create category (chef only)
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

      const { name, description, displayOrder } = req.body;

      const category = await prisma.category.create({
        data: {
          name,
          description,
          displayOrder: displayOrder || 0,
        },
      });

      res.status(201).json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update category (chef only)
router.put(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const { name, description, displayOrder } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(displayOrder !== undefined && { displayOrder }),
        },
      });

      res.json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete category (chef only)
router.delete(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.category.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

