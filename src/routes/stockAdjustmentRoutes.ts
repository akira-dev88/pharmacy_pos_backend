import { Router } from 'express';

import {
  StockAdjustmentController
} from '../controllers/stockAdjustmentController';

import {
  authenticate,
  authorize
} from '../middleware/auth';

const router = Router();

router.use(authenticate);

// LIST
router.get(
  '/',
  authorize(
    'owner',
    'manager',
    'admin'
  ),
  StockAdjustmentController.index
);

// CREATE
router.post(
  '/',
  authorize(
    'owner',
    'manager',
    'admin'
  ),
  StockAdjustmentController.create
);

export default router;