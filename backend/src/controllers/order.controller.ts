import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const orderItemSchema = z.object({
  dishId: z.string(),
  quantity: z.number().int().min(1),
  customization: z.any().optional(), // For future use
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema),
});

export const createOrder = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { items } = createOrderSchema.parse(req.body);

    // 1. Fetch User Profile for Allergen Check
    const userProfile = await prisma.customerProfile.findUnique({
      where: { userId },
    });

    // 2. Fetch Dishes to calculate total and check allergens
    const dishIds = items.map(i => i.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
    });

    const dishMap = new Map(dishes.map(d => [d.id, d]));
    let totalAmount = 0;
    const conflicts: string[] = [];

    // 3. Process items
    const orderItemsForDb = [];

    for (const item of items) {
      const dish = dishMap.get(item.dishId);
      if (!dish) {
        return res.status(400).json({ message: `Dish not found: ${item.dishId}` });
      }

      if (!dish.isAvailable) {
        return res.status(400).json({ message: `Dish is not available: ${dish.name}` });
      }

      // Allergen Check
      if (userProfile && userProfile.allergens.length > 0) {
        const hasConflict = dish.allergens.some(allergen => 
          userProfile.allergens.includes(allergen)
        );
        if (hasConflict) {
          conflicts.push(dish.name);
        }
      }

      // Calculate Price (Simple version)
      // Prisma Decimal is tricky in JS, assuming Number for simplicity here but in prod use Decimal.js
      totalAmount += Number(dish.price) * item.quantity;
      
      orderItemsForDb.push({
        ...item,
        name: dish.name,
        price: dish.price
      });
    }

    if (conflicts.length > 0) {
      return res.status(400).json({ 
        message: 'Order contains allergens that conflict with your profile', 
        conflicts 
      });
    }

    // 4. Create Order
    const order = await prisma.order.create({
      data: {
        customerId: userId,
        items: orderItemsForDb,
        totalAmount: totalAmount,
        status: 'PENDING',
      },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error creating order', error });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role } = req.user;
    
    let whereClause = {};
    if (role === 'CUSTOMER') {
      whereClause = { customerId: userId };
    }
    // Chef sees all

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } }
      }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Should validate enum
    
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error });
  }
};

