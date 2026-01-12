import { Router } from 'express';
import { createOrder, getOrders, updateOrderStatus } from '../controllers/order.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticateToken, createOrder);
router.get('/', authenticateToken, getOrders);
router.put('/:id/status', authenticateToken, requireRole('CHEF'), updateOrderStatus);

export default router;

