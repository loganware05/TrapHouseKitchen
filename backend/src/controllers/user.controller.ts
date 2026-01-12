import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const profileSchema = z.object({
  allergens: z.array(z.string()),
  dietaryPreferences: z.array(z.string()),
});

export const getProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    const profile = await prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { allergens, dietaryPreferences } = profileSchema.parse(req.body);

    const profile = await prisma.customerProfile.upsert({
      where: { userId },
      update: {
        allergens,
        dietaryPreferences,
      },
      create: {
        userId,
        allergens,
        dietaryPreferences,
      },
    });

    res.json(profile);
  } catch (error) {
    res.status(400).json({ message: 'Error updating profile', error });
  }
};

