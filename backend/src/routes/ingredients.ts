import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all ingredients
router.get('/', async (_req, res, next) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      include: {
        allergens: {
          include: {
            allergen: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({
      status: 'success',
      data: { ingredients },
    });
  } catch (error) {
    next(error);
  }
});

// Create ingredient (chef only)
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

      const { name, description, isVegan, isVegetarian, allergenIds } = req.body;

      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          description,
          isVegan: isVegan || false,
          isVegetarian: isVegetarian || false,
          ...(allergenIds && {
            allergens: {
              create: allergenIds.map((allergenId: string) => ({
                allergenId,
              })),
            },
          }),
        },
        include: {
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: { ingredient },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update ingredient (chef only)
router.put(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const { name, description, isVegan, isVegetarian, allergenIds } = req.body;

      // Update allergens if provided
      if (allergenIds) {
        await prisma.ingredientAllergen.deleteMany({
          where: { ingredientId: id },
        });
      }

      const ingredient = await prisma.ingredient.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isVegan !== undefined && { isVegan }),
          ...(isVegetarian !== undefined && { isVegetarian }),
          ...(allergenIds && {
            allergens: {
              create: allergenIds.map((allergenId: string) => ({
                allergenId,
              })),
            },
          }),
        },
        include: {
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: { ingredient },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete ingredient (chef only)
router.delete(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.ingredient.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

