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

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return res.status(404).json({ message: 'User not found' });
    }

    // Transform to match expected profile format
    const profile = {
      allergens: user.allergenProfile.map(ua => ua.allergen.name),
      dietaryPreferences: user.dietaryPreferences.map(dp => dp.name),
    };

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

    // This is a simplified version - in production you'd want to:
    // 1. Look up allergen IDs from names
    // 2. Handle the many-to-many relationships properly
    // 3. Use transactions for data consistency
    
    // For now, just return the input as confirmation
    // The proper implementation would require additional allergen lookup queries
    
    res.json({ 
      message: 'Profile update endpoint needs proper implementation with allergen ID lookups',
      data: { allergens, dietaryPreferences }
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating profile', error });
  }
};

