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
      },
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
      },
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
      },
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

// Get eligible orders for review
export const getEligibleOrders = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await prisma.order.findMany({
      where: {
        userId: req.user!.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        completedAt: {
          gte: thirtyDaysAgo,
        },
        reviews: {
          none: {}, // No existing review
        },
      },
      include: {
        items: {
          include: {
            dish: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};

// Create review
export const createReview = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { orderId, rating, comment } = req.body;

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            dish: {
              select: {
                name: true,
              },
            },
          },
        },
        reviews: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.userId !== req.user!.id) {
      throw new AppError('Not authorized to review this order', 403);
    }

    if (order.status !== 'COMPLETED' || order.paymentStatus !== 'PAID') {
      throw new AppError('Can only review completed and paid orders', 400);
    }

    // Check if order was completed within last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (!order.completedAt || order.completedAt < thirtyDaysAgo) {
      throw new AppError('Can only review orders completed within the last 30 days', 400);
    }

    // Check if review already exists
    if (order.reviews.length > 0) {
      throw new AppError('You have already reviewed this order', 400);
    }

    // Extract dish names
    const dishNames = order.items.map(item => item.dish.name);

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId,
        userId: req.user!.id,
        rating,
        comment,
        dishNames,
        approved: false, // Requires chef approval
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
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
      },
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
