import { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All purchase routes require authentication
router.use(authenticate);

// Match PHP routes exactly
router.post('/', PurchaseController.store);
router.get('/', PurchaseController.index);

export default router;
