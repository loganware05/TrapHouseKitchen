import { Router } from 'express';
import { getRequests, createRequest, voteRequest } from '../controllers/dish-request.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRequests);
router.post('/', authenticateToken, createRequest);
router.post('/:id/vote', authenticateToken, voteRequest);

export default router;

