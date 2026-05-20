import { Router } from 'express';

import {
  MedicineReturnController
} from '../controllers/medicineReturnController';

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
  MedicineReturnController.index
);

// CREATE
router.post(
  '/',
  authorize(
    'owner',
    'manager',
    'admin'
  ),
  MedicineReturnController.create
);

export default router;