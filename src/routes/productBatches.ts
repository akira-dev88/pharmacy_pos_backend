import { Router } from 'express';

import {
  ProductBatchController
} from '../controllers/ProductBatchController';

import {
  authenticate
} from '../middleware/auth';

const router = Router();

router.use(authenticate);

// CREATE BATCH
router.post(
  '/',
  ProductBatchController.create
);

// GET PRODUCT BATCHES
router.get(
  '/product/:product_uuid',
  ProductBatchController.getByProduct
);

router.get(
  '/available/:product_uuid',
  ProductBatchController.available
);

export default router;