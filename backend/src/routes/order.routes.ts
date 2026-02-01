import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { sendOrderConfirmationEmail, sendNewOrderNotificationToChef, sendOrderStatusEmail } from '../services/emailService';
import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

// Get user's orders
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const orders = await prisma.order.findMany({
      where: { 
        userId: req.user!.id,
        isArchived: false, // Exclude archived orders for customers
      },
      include: {
        items: {
          include: {
            dish: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

// Get all orders (chef only)
router.get('/all', authenticate, authorize('CHEF', 'ADMIN'), async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { status, includeArchived } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        // Show orders that are paid or pending payment (not unpaid/abandoned)
        paymentStatus: { in: ['PAID', 'PENDING'] },
        ...(status && { status: status as any }),
        ...(includeArchived !== 'true' && { isArchived: false }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            dish: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            dish: {
              include: {
                category: true,
                allergens: {
                  include: {
                    allergen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Check authorization
    if (order.userId !== req.user!.id && !['CHEF', 'ADMIN'].includes(req.user!.role)) {
      throw new AppError('Not authorized', 403);
    }

    res.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Create order
router.post(
  '/',
  authenticate,
  orderLimiter,
  [
    body('items').isArray({ min: 1 }),
    body('items.*.dishId').notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { items, specialInstructions } = req.body;

      // Validate dishes exist and calculate total
      const dishIds = items.map((item: any) => item.dishId);
      const dishes = await prisma.dish.findMany({
        where: {
          id: { in: dishIds },
          status: 'AVAILABLE',
        },
      });

      if (dishes.length !== dishIds.length) {
        throw new AppError('Some dishes are not available', 400);
      }

      // Calculate total price
      let totalPrice = 0;
      const orderItems = items.map((item: any) => {
        const dish = dishes.find(d => d.id === item.dishId);
        if (!dish) throw new AppError('Dish not found', 404);
        
        const itemTotal = dish.price * item.quantity;
        totalPrice += itemTotal;

        return {
          dishId: item.dishId,
          quantity: item.quantity,
          priceAtOrder: dish.price,
          customizations: item.customizations || null,
        };
      });

      // Create order with items
      const order = await prisma.order.create({
        data: {
          userId: req.user!.id,
          totalPrice,
          finalAmount: totalPrice, // Initially same as totalPrice, will be updated with tips at checkout
          tipAmount: 0, // Will be updated at checkout
          specialInstructions: specialInstructions || null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              dish: true,
            },
          },
          user: true,
        },
      });

      // Send order confirmation email (async - don't wait)
      sendOrderConfirmationEmail({
        customerName: req.user!.name,
        customerEmail: req.user!.email || '',
        orderNumber: order.orderNumber.toString(),
        orderDate: new Date(order.createdAt).toLocaleString(),
        items: order.items.map(item => ({
          name: item.dish.name,
          quantity: item.quantity,
          price: item.priceAtOrder,
        })),
        subtotal: order.totalPrice,
        tip: order.tipAmount,
        total: order.finalAmount,
        paymentStatus: order.paymentStatus,
        prepTime: order.prepTime || 25,
        specialInstructions: order.specialInstructions || undefined,
      }).catch(err => console.error('Email send error:', err));

      // Notify chef (async - don't wait)
      sendNewOrderNotificationToChef({
        customerName: req.user!.name,
        customerEmail: req.user!.email || '',
        orderNumber: order.orderNumber.toString(),
        orderDate: new Date(order.createdAt).toLocaleString(),
        items: order.items.map(item => ({
          name: item.dish.name,
          quantity: item.quantity,
          price: item.priceAtOrder,
        })),
        subtotal: order.totalPrice,
        tip: order.tipAmount,
        total: order.finalAmount,
        paymentStatus: order.paymentStatus,
        prepTime: order.prepTime || 25,
        specialInstructions: order.specialInstructions || undefined,
      }).catch(err => console.error('Chef email send error:', err));

      res.status(201).json({
        status: 'success',
        data: { order },
      });
    } catch (error: any) {
      console.error('Error creating order:', error);
      // If it's a Prisma error, provide more details
      if (error.code === 'P2002') {
        return next(new AppError('Order number conflict. Please try again.', 409));
      }
      if (error.code === 'P2003') {
        return next(new AppError('Invalid reference in order data.', 400));
      }
      next(error);
    }
  }
);

// Update order status (chef only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  [body('status').isIn(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { id } = req.params;
      const { status } = req.body;

      const order = await prisma.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' && { completedAt: new Date() }),
        },
        include: {
          items: {
            include: {
              dish: true,
            },
          },
          user: true,
        },
      });

      // Send status update email to customer (async - don't wait)
      if (['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
        sendOrderStatusEmail({
          customerName: order.user.name,
          customerEmail: order.user.email || '',
          orderNumber: order.orderNumber.toString(),
          status,
          estimatedTime: status === 'READY' ? 'Now' : undefined,
        }).catch(err => console.error('Status email send error:', err));
      }

      res.json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Archive completed orders (chef only)
router.post(
  '/archive-completed',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const result = await prisma.order.updateMany({
        where: {
          status: {
            in: ['COMPLETED', 'CANCELLED'],
          },
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });

      res.json({
        status: 'success',
        data: { archivedCount: result.count },
        message: `Successfully archived ${result.count} orders`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset order counter (chef only)
router.post(
  '/reset-counter',
  authenticate,
  authorize('CHEF', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      // This is a PostgreSQL-specific operation
      // We need to reset the sequence for orderNumber
      await prisma.$executeRaw`ALTER SEQUENCE "Order_orderNumber_seq" RESTART WITH 1`;

      res.json({
        status: 'success',
        message: 'Order counter reset to 1. Next order will be #1.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

