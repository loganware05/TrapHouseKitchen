import rateLimit from 'express-rate-limit';

const skipForAutomatedTests = () =>
  process.env.VITEST === 'true' || process.env.E2E_CAPTURE_PASSWORD_RESET === '1';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // E2E / Vitest share one IP and exceed the public API budget quickly.
  skip: skipForAutomatedTests,
});

// Auth endpoints rate limiter - 5 requests per 15 minutes (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Playwright E2E boots API with E2E_CAPTURE_PASSWORD_RESET=1; Vitest sets VITEST.
  // Keep real limits for normal local/staging/production boots.
  skip: skipForAutomatedTests,
});

// Payment endpoints rate limiter - 10 requests per 15 minutes
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    status: 'error',
    message: 'Too many payment requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForAutomatedTests,
});

// Order creation rate limiter - 20 orders per hour
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    status: 'error',
    message: 'Order limit reached for this hour, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForAutomatedTests,
});

// Forgot-password rate limiter - 5 requests per 15 minutes (no skipSuccessfulRequests)
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many password reset attempts, please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Vitest/E2E share one IP across many cases; keep prod/staging limits real.
  skip: skipForAutomatedTests,
});
