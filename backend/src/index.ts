import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { apiLimiter } from './middleware/rateLimiter';
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
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - Required for Render, Heroku, etc.
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

// Webhook routes MUST come before express.json() to receive raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});

export default app;
