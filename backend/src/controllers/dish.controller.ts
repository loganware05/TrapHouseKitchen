import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const dishSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  categoryId: z.string(), // Changed from category to categoryId
  imageUrl: z.string().optional(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'SEASONAL']).default('AVAILABLE'), // Changed from isAvailable
  allergenIds: z.array(z.string()).optional(), // For creating allergen relations
  isVegan: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  prepTime: z.number().optional(),
  spiceLevel: z.number().optional(),
});

export const getDishes = async (req: Request, res: Response) => {
  try {
    const dishes = await prisma.dish.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dishes', error });
  }
};

export const createDish = async (req: Request, res: Response) => {
  try {
    const { allergenIds, ...data } = dishSchema.parse(req.body);
    
    const dish = await prisma.dish.create({
      data: {
        ...data,
        ...(allergenIds && allergenIds.length > 0 && {
          allergens: {
            create: allergenIds.map(allergenId => ({
              allergenId,
            })),
          },
        }),
      },
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
      },
    });
    res.status(201).json(dish);
  } catch (error) {
    res.status(400).json({ message: 'Error creating dish', error });
  }
};

export const updateDish = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { allergenIds, ...data } = dishSchema.partial().parse(req.body);
    
    const updateData: any = { ...data };
    
    // If allergenIds are provided, update the allergen relations
    if (allergenIds) {
      // Delete existing allergen relations and create new ones
      await prisma.dishAllergen.deleteMany({
        where: { dishId: id },
      });
      
      if (allergenIds.length > 0) {
        updateData.allergens = {
          create: allergenIds.map(allergenId => ({
            allergenId,
          })),
        };
      }
    }
    
    const dish = await prisma.dish.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        allergens: {
          include: {
            allergen: true,
          },
        },
      },
    });
    res.json(dish);
  } catch (error) {
    res.status(400).json({ message: 'Error updating dish', error });
  }
};

export const deleteDish = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dish.delete({ where: { id } });
    res.json({ message: 'Dish deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting dish', error });
  }
};

