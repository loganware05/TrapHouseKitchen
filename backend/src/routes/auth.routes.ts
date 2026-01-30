import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
  ],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError('Email already registered', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'CUSTOMER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
      );

      res.status(201).json({
        status: 'success',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
      );

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Guest login (no email/password required)
router.post(
  '/guest',
  [body('name').trim().notEmpty()],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Name is required', 400);
      }

      const { name } = req.body;

      // Create guest user
      const user = await prisma.user.create({
        data: {
          name,
          role: 'CUSTOMER',
          isGuest: true,
        },
        select: {
          id: true,
          name: true,
          role: true,
          isGuest: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '24h' } as jwt.SignOptions // Shorter expiry for guests
      );

      res.status(201).json({
        status: 'success',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isGuest: true,
        createdAt: true,
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

export default router;

