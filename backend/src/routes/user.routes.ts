import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Get user profile with allergens and preferences
router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        allergenProfile: {
          include: {
            allergen: true,
          },
        },
        dietaryPreferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Update allergen profile
router.post(
  '/allergens',
  authenticate,
  [body('allergenIds').isArray()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { allergenIds } = req.body;

      // Delete existing allergens
      await prisma.userAllergen.deleteMany({
        where: { userId: req.user!.id },
      });

      // Add new allergens
      if (allergenIds.length > 0) {
        await prisma.userAllergen.createMany({
          data: allergenIds.map((allergenId: string) => ({
            userId: req.user!.id,
            allergenId,
          })),
        });
      }

      const updatedProfile = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          allergenProfile: {
            include: {
              allergen: true,
            },
          },
        },
      });

      res.json({
        status: 'success',
        data: { user: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update dietary preferences
router.post(
  '/dietary-preferences',
  authenticate,
  [body('preferences').isArray()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { preferences } = req.body;

      // Delete existing preferences
      await prisma.dietaryPreference.deleteMany({
        where: { userId: req.user!.id },
      });

      // Add new preferences
      if (preferences.length > 0) {
        await prisma.dietaryPreference.createMany({
          data: preferences.map((pref: { name: string; description?: string }) => ({
            userId: req.user!.id,
            name: pref.name,
            description: pref.description,
          })),
          skipDuplicates: true,
        });
      }

      const updatedProfile = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          dietaryPreferences: true,
        },
      });

      res.json({
        status: 'success',
        data: { user: updatedProfile },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

