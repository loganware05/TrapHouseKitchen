import { Router } from 'express';
import { getDishes, createDish, updateDish, deleteDish } from '../controllers/dish.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getDishes); // Public
router.post('/', authenticateToken, requireRole('CHEF'), createDish);
router.put('/:id', authenticateToken, requireRole('CHEF'), updateDish);
router.delete('/:id', authenticateToken, requireRole('CHEF'), deleteDish);

export default router;

