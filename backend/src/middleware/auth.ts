import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export type AuthRequest = Request & {
  user?: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
};

const jwtSecret = () => process.env.JWT_SECRET || 'default-secret';

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

    const decoded = jwt.verify(token, jwtSecret()) as {
      id: string;
      name?: string;
      email?: string;
      role: string;
    };

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
export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, jwtSecret()) as {
      id: string;
      name?: string;
      email?: string;
      role: string;
    };
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

