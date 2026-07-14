import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from './emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

export type AuthTokenPayload = {
  id: string;
  name: string;
  email?: string;
  role: string;
};

export function signCustomerToken(user: {
  id: string;
  email: string | null;
  name: string;
  role: string;
}): string {
  const payload: AuthTokenPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    ...(user.email ? { email: user.email } : {}),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
}

export function signGuestToken(user: { id: string; name: string; role: string }): string {
  const payload: AuthTokenPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' } as jwt.SignOptions);
}

export async function registerUser(email: string, password: string, name: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }
  const hashedPassword = await bcrypt.hash(password, 12);
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
  const token = signCustomerToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  return { user, token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw new AppError('Invalid credentials', 401);
  }
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401);
  }
  const token = signCustomerToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

/**
 * Issues a one-hour reset token and sends email. Always appears successful to avoid email enumeration.
 */
export async function requestPasswordReset(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return;

  const user = await prisma.user.findFirst({
    where: {
      email,
      isGuest: false,
      password: { not: null },
    },
  });
  if (!user?.email) {
    return;
  }

  const rawToken = randomBytes(32).toString('hex');
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: rawToken,
      passwordResetExpires,
    },
  });

  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendPasswordResetEmail({
    name: user.name,
    email: user.email,
    resetToken: rawToken,
    resetUrl,
  });
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (!token?.trim()) {
    throw new AppError('Reset token is required', 400);
  }
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token.trim(),
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset link', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}

export async function createGuestUser(name: string) {
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
  const token = signGuestToken({
    id: user.id,
    name: user.name,
    role: user.role,
  });
  return { user, token };
}
