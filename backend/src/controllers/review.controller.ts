import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateCouponCode } from '../utils/couponGenerator';

// Get all approved reviews (public)
export const getAllReviews = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { sortBy = 'newest' } = req.query;
    
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'highest') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'lowest') {
      orderBy = { rating: 'asc' };
    }

    const reviews = await prisma.review.findMany({
      where: { approved: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
          },
        },
        dish: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      } as any,
      orderBy,
    });

    res.json({
      status: 'success',
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// Get user's own reviews
export const getMyReviews = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
          },
        },
        dish: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// Get pending reviews (chef only)
export const getPendingReviews = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { approved: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
          },
        },
        dish: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

// Get eligible orders for review (returns orders with dishes that can be reviewed)
export const getEligibleOrders = async (req: AuthRequest, res: Response, next: any) => {
  try {
    // Use configurable review window (default 30 days)
    const reviewWindowDays = parseInt(process.env.REVIEW_WINDOW_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reviewWindowDays);

    // Get orders that are completed, paid, and within review window
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user!.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        completedAt: {
          gte: cutoffDate,
        },
      },
      include: {
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reviews: {
          select: {
            dishId: true,
          } as any,
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Filter out dishes that already have reviews
    const ordersWithEligibleDishes = orders.map(order => {
      const reviewedDishIds = new Set(
        order.reviews.map((r: any) => r.dishId).filter(Boolean)
      );
      const eligibleItems = order.items.filter((item: any) => 
        !reviewedDishIds.has(item.dishId)
      );
      
      return {
        ...order,
        items: eligibleItems,
        hasEligibleDishes: eligibleItems.length > 0,
      };
    }).filter((order: any) => order.hasEligibleDishes);

    res.json({
      status: 'success',
      data: { orders: ordersWithEligibleDishes },
    });
  } catch (error) {
    next(error);
  }
};

// Create review (per-dish)
export const createReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { orderId, dishId, rating, comment } = req.body;

    if (!dishId) {
      throw new AppError('Dish ID is required', 400);
    }

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reviews: {
          where: {
            dishId: dishId,
          } as any,
        },
      } as any,
    }) as any;

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== req.user!.id) {
      throw new AppError('Not authorized to review this order', 403);
    }

    if (order.status !== 'COMPLETED' || order.paymentStatus !== 'PAID') {
      throw new AppError('Can only review completed and paid orders', 400);
    }

    // Check if order was completed within review window
    const reviewWindowDays = parseInt(process.env.REVIEW_WINDOW_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - reviewWindowDays);
    
    if (!order.completedAt || order.completedAt < cutoffDate) {
      throw new AppError(`Can only review orders completed within the last ${reviewWindowDays} days`, 400);
    }

    // Verify dish exists in order
    const orderItem = order.items.find((item: any) => item.dishId === dishId);
    if (!orderItem) {
      throw new AppError('Dish not found in this order', 400);
    }

    // Check if dish already has a review for this order
    const existingDishReview = order.reviews.find((r: any) => r.dishId === dishId);
    if (existingDishReview) {
      throw new AppError('You have already reviewed this dish from this order', 400);
    }

    // Create review for specific dish
    const review = await prisma.review.create({
      data: {
        orderId,
        dishId,
        orderItemId: orderItem.id,
        userId: req.user!.id,
        rating,
        comment,
        dishName: orderItem.dish.name,
        approved: false, // Requires chef approval
      } as any,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        dish: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      } as any,
    });

    res.status(201).json({
      status: 'success',
      data: { review },
      message: 'Review submitted! Once approved by our chef, you\'ll receive a $4 discount code.',
    });
  } catch (error) {
    next(error);
  }
};

// Update review
export const updateReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Only the review owner can update their review
    if (review.userId !== req.user!.id) {
      throw new AppError('Not authorized to update this review', 403);
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating,
        comment,
        updatedAt: new Date(),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        dish: {
          select: {
            id: true,
            name: true,
          },
        } as any,
      } as any,
    });

    res.json({
      status: 'success',
      data: { review: updatedReview },
    });
  } catch (error) {
    next(error);
  }
};

// Delete review
export const deleteReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Owner or chef/admin can delete
    if (review.userId !== req.user!.id && !['CHEF', 'ADMIN'].includes(req.user!.role)) {
      throw new AppError('Not authorized to delete this review', 403);
    }

    await prisma.review.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Approve review and create coupon (chef only)
export const approveReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.approved) {
      throw new AppError('Review is already approved', 400);
    }

    // Generate unique coupon code
    const couponCode = generateCouponCode();

    // Start transaction to approve review and create coupon
    const result = await prisma.$transaction(async (tx) => {
      // Approve review
      const approvedReview = await tx.review.update({
        where: { id },
        data: { approved: true },
      });

      // Create coupon
      const coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          userId: review.userId,
          discountAmount: 4.00,
          used: false,
        },
      });

      return { review: approvedReview, coupon };
    });

    res.json({
      status: 'success',
      data: result,
      message: `Review approved and $4 coupon created for ${review.user.name}`,
    });
  } catch (error) {
    next(error);
  }
};

// Reject review (chef only)
export const rejectReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Delete the review
    await prisma.review.delete({
      where: { id },
    });

    res.json({
      status: 'success',
      message: 'Review rejected and deleted',
    });
  } catch (error) {
    next(error);
  }
};
