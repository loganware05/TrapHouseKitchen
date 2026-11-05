import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { getJwtSecret } from '../lib/jwtConfig';
import { AppError } from './errorHandler';

export type AuthRequest = Request & {
  user?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
};

type AccessTokenClaims = {
  id: string;
  name?: string;
  email?: string;
  role: string;
  tokenVersion?: number;
};

function assertValidTokenVersion(
  decoded: AccessTokenClaims,
  userTokenVersion: number
): void {
  if (typeof decoded.tokenVersion !== 'number') {
    throw new AppError('Invalid token', 401);
  }
  if (userTokenVersion !== decoded.tokenVersion) {
    throw new AppError('Invalid token', 401);
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, getJwtSecret()) as AccessTokenClaims;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true },
    });

    if (!user) {
      throw new AppError('Invalid token', 401);
    }
    assertValidTokenVersion(decoded, user.tokenVersion);

    req.user = {
      id: decoded.id,
      name: decoded.name ?? '',
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/** Attach user when a valid Bearer token is present; otherwise continue anonymously (no error). */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, getJwtSecret()) as AccessTokenClaims;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true },
    });

    if (!user || typeof decoded.tokenVersion !== 'number' || user.tokenVersion !== decoded.tokenVersion) {
      return next();
    }

    req.user = {
      id: decoded.id,
      name: decoded.name ?? '',
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    next();
  }
};

