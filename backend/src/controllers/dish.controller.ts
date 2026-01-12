import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const dishSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  imageUrl: z.string().optional(),
  allergens: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
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
    const data = dishSchema.parse(req.body);
    const dish = await prisma.dish.create({
      data: {
        ...data,
        price: data.price, // Prisma handles Decimal from number usually, or pass string? Decimal needs string/number.
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
    const data = dishSchema.partial().parse(req.body);
    const dish = await prisma.dish.update({
      where: { id },
      data,
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

