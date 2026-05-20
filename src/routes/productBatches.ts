import { Router } from 'express';

import {
  ProductBatchController
} from '../controllers/ProductBatchController';

import {
  authenticate
} from '../middleware/auth';

const router = Router();

router.use(authenticate);

// CREATE
router.post(
  '/',
  ProductBatchController.create
);

// PRODUCT BATCHES
router.get(
  '/product/:product_uuid',
  ProductBatchController.getByProduct
);

// AVAILABLE
router.get(
  '/available/:product_uuid',
  ProductBatchController.available
);

// FEFO TEST
router.post(
  '/consume-fefo',
  ProductBatchController.consumeFEFO
);

// NEAR EXPIRY
router.get(
  '/near-expiry',
  ProductBatchController.nearExpiry
);

// QUARANTINE
router.post(
  '/quarantine-expired',
  ProductBatchController.quarantineExpired
);

export default router;