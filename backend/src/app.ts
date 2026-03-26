import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import { apiLimiter } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dishRoutes from './routes/dish.routes';
import categoryRoutes from './routes/category.routes';
import ingredientRoutes from './routes/ingredient.routes';
import allergenRoutes from './routes/allergen.routes';
import orderRoutes from './routes/order.routes';
import dishRequestRoutes from './routes/dish-request.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import reviewRoutes from './routes/review.routes';
import couponRoutes from './routes/coupon.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();

// Trust proxy - Required for Render, Heroku, etc.
app.set('trust proxy', 1);

app.use(helmet());
app.use(requestIdMiddleware);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

// Webhook routes MUST come before express.json() to receive raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check — verifies DB connectivity for load balancers / orchestrators
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      ...(req.requestId && { requestId: req.requestId }),
    });
  } catch (e) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      ...(req.requestId && { requestId: req.requestId }),
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/allergens', allergenRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dish-requests', dishRequestRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Error handling
app.use(errorHandler);

export default app;
