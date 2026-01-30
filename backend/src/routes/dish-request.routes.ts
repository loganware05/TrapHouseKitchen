import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';

const router = Router();

// Get all dish requests
router.get('/', async (_req, res, next) => {
  try {
    const dishRequests = await prisma.dishRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { votes: true },
        },
      },
      orderBy: [
        { upvotes: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      status: 'success',
      data: { dishRequests },
    });
  } catch (error) {
    next(error);
  }
});

// Get single dish request
router.get('/:id', async (req, res, next: any) => {
  try {
    const dishRequest = await prisma.dishRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!dishRequest) {
      throw new AppError('Dish request not found', 404);
    }

    res.json({
      status: 'success',
      data: { dishRequest },
    });
  } catch (error) {
    next(error);
  }
});

// Create dish request
router.post(
  '/',
  authenticate,
  [
    body('title').trim().notEmpty().isLength({ max: 200 }),
    body('description').trim().notEmpty().isLength({ max: 1000 }),
  ],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { title, description } = req.body;

      const dishRequest = await prisma.dishRequest.create({
        data: {
          userId: req.user!.id,
          title,
          description,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        status: 'success',
        data: { dishRequest },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Vote on dish request
router.post(
  '/:id/vote',
  authenticate,
  [body('isUpvote').isBoolean()],
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { id } = req.params;
      const { isUpvote } = req.body;

      // Check if user already voted
      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_dishRequestId: {
            userId: req.user!.id,
            dishRequestId: id,
          },
        },
      });

      if (existingVote) {
        // Update vote if different
        if (existingVote.isUpvote !== isUpvote) {
          await prisma.$transaction([
            prisma.vote.update({
              where: { id: existingVote.id },
              data: { isUpvote },
            }),
            prisma.dishRequest.update({
              where: { id },
              data: {
                upvotes: isUpvote ? { increment: 1 } : { decrement: 1 },
                downvotes: isUpvote ? { decrement: 1 } : { increment: 1 },
              },
            }),
          ]);
        }
      } else {
        // Create new vote
        await prisma.$transaction([
          prisma.vote.create({
            data: {
              userId: req.user!.id,
              dishRequestId: id,
              isUpvote,
            },
          }),
          prisma.dishRequest.update({
            where: { id },
            data: {
              upvotes: isUpvote ? { increment: 1 } : undefined,
              downvotes: !isUpvote ? { increment: 1 } : undefined,
            },
          }),
        ]);
      }

      const updatedDishRequest = await prisma.dishRequest.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { votes: true },
          },
        },
      });

      res.json({
        status: 'success',
        data: { dishRequest: updatedDishRequest },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove vote
router.delete(
  '/:id/vote',
  authenticate,
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const { id } = req.params;

      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_dishRequestId: {
            userId: req.user!.id,
            dishRequestId: id,
          },
        },
      });

      if (!existingVote) {
        throw new AppError('Vote not found', 404);
      }

      await prisma.$transaction([
        prisma.vote.delete({
          where: { id: existingVote.id },
        }),
        prisma.dishRequest.update({
          where: { id },
          data: {
            upvotes: existingVote.isUpvote ? { decrement: 1 } : undefined,
            downvotes: !existingVote.isUpvote ? { decrement: 1 } : undefined,
          },
        }),
      ]);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Delete dish request (own requests only, or chef/admin)
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: any) => {
    try {
      const { id } = req.params;

      const dishRequest = await prisma.dishRequest.findUnique({
        where: { id },
      });

      if (!dishRequest) {
        throw new AppError('Dish request not found', 404);
      }

      // Check authorization
      if (dishRequest.userId !== req.user!.id && !['CHEF', 'ADMIN'].includes(req.user!.role)) {
        throw new AppError('Not authorized', 403);
      }

      await prisma.dishRequest.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

