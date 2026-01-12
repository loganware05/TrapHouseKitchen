import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all dishes (public)
router.get('/', async (req, res, next) => {
  try {
    const { categoryId, status } = req.query;

    const dishes = await prisma.dish.findMany({
      where: {
        ...(categoryId && { categoryId: categoryId as string }),
        ...(status && { status: status as any }),
      },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: {
              include: {
                allergens: {
                  include: {
                    allergen: true,
                  },
                },
              },
            },
          },
        },
        allergens: {
          include: {
            allergen: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: { dishes },
    });
  } catch (error) {
    next(error);
  }
});

// Get single dish
router.get('/:id', async (req, res, next) => {
  try {
    const dish = await prisma.dish.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: {
              include: {
                allergens: {
                  include: {
                    allergen: true,
                  },
                },
              },
            },
          },
        },
        allergens: {
          include: {
            allergen: true,
          },
        },
      },
    });

    if (!dish) {
      throw new AppError('Dish not found', 404);
    }

    res.json({
      status: 'success',
      data: { dish },
    });
  } catch (error) {
    next(error);
  }
});

// Create dish (chef only)
router.post(
  '/',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('categoryId').notEmpty(),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const {
        name,
        description,
        price,
        categoryId,
        imageUrl,
        status,
        prepTime,
        spiceLevel,
        isVegan,
        isVegetarian,
        isGlutenFree,
        ingredientIds,
        allergenIds,
      } = req.body;

      const dish = await prisma.dish.create({
        data: {
          name,
          description,
          price,
          categoryId,
          imageUrl,
          status: status || 'AVAILABLE',
          prepTime,
          spiceLevel,
          isVegan: isVegan || false,
          isVegetarian: isVegetarian || false,
          isGlutenFree: isGlutenFree || false,
          ...(ingredientIds && {
            ingredients: {
              create: ingredientIds.map((ingredientId: string) => ({
                ingredientId,
              })),
            },
          }),
          ...(allergenIds && {
            allergens: {
              create: allergenIds.map((allergenId: string) => ({
                allergenId,
              })),
            },
          }),
        },
        include: {
          category: true,
          ingredients: {
            include: {
              ingredient: true,
            },
          },
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: { dish },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update dish (chef only)
router.put(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        categoryId,
        imageUrl,
        status,
        prepTime,
        spiceLevel,
        isVegan,
        isVegetarian,
        isGlutenFree,
        ingredientIds,
        allergenIds,
      } = req.body;

      // Delete existing ingredients and allergens if updating them
      if (ingredientIds) {
        await prisma.dishIngredient.deleteMany({
          where: { dishId: id },
        });
      }

      if (allergenIds) {
        await prisma.dishAllergen.deleteMany({
          where: { dishId: id },
        });
      }

      const dish = await prisma.dish.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(price !== undefined && { price }),
          ...(categoryId && { categoryId }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(status && { status }),
          ...(prepTime !== undefined && { prepTime }),
          ...(spiceLevel !== undefined && { spiceLevel }),
          ...(isVegan !== undefined && { isVegan }),
          ...(isVegetarian !== undefined && { isVegetarian }),
          ...(isGlutenFree !== undefined && { isGlutenFree }),
          ...(ingredientIds && {
            ingredients: {
              create: ingredientIds.map((ingredientId: string) => ({
                ingredientId,
              })),
            },
          }),
          ...(allergenIds && {
            allergens: {
              create: allergenIds.map((allergenId: string) => ({
                allergenId,
              })),
            },
          }),
        },
        include: {
          category: true,
          ingredients: {
            include: {
              ingredient: true,
            },
          },
          allergens: {
            include: {
              allergen: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: { dish },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete dish (chef only)
router.delete(
  '/:id',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      await prisma.dish.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

