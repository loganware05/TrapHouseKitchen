import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import {
  createGuestUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../services/auth.service';

const router = Router();

router.post(
  '/register',
  authLimiter,
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
      const { user, token } = await registerUser(email, password, name);
      res.status(201).json({
        status: 'success',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { email, password } = req.body;
      const { user, token } = await loginUser(email, password);
      res.json({
        status: 'success',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/guest',
  authLimiter,
  [body('name').trim().notEmpty()],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Name is required', 400);
      }
      const { name } = req.body;
      const { user, token } = await createGuestUser(name);
      res.status(201).json({
        status: 'success',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { email } = req.body;
      const linkPayload = await requestPasswordReset(email);
      const resetUrl = linkPayload.resetUrl;
      res.json({
        status: 'success',
        message: 'If that email is on file, check your inbox for reset instructions.',
        ...(resetUrl
          ? {
              data: {
                resetUrl,
                resetToken: linkPayload.resetToken,
              },
            }
          : {}),
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').trim().notEmpty(), body('password').isLength({ min: 6 })],
  async (req: any, res: any, next: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }
      const { token, password } = req.body;
      await resetPasswordWithToken(token, password);
      res.json({
        status: 'success',
        message: 'Password updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

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
