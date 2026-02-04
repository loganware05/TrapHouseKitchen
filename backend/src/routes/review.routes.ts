import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllReviews,
  getMyReviews,
  getPendingReviews,
  getEligibleOrders,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  rejectReview,
} from '../controllers/review.controller';

const router = Router();

// Public routes
router.get('/', getAllReviews);

// Protected routes (require authentication)
router.get('/my', authenticate, getMyReviews);
router.get('/eligible-orders', authenticate, getEligibleOrders);

router.post(
  '/',
  authenticate,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('dishId').notEmpty().withMessage('Dish ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').isString().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
  ],
  createReview
);

router.patch(
  '/:id',
  authenticate,
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
  ],
  updateReview
);

router.delete('/:id', authenticate, deleteReview);

// Chef-only routes
router.get('/pending', authenticate, authorize('CHEF', 'ADMIN'), getPendingReviews);
router.post('/:id/approve', authenticate, authorize('CHEF', 'ADMIN'), approveReview);
router.post('/:id/reject', authenticate, authorize('CHEF', 'ADMIN'), rejectReview);

export default router;
