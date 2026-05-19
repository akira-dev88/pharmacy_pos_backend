// routes/attributes.ts

import { Router } from 'express';

import {
  AttributeController
} from '../controllers/attributeController';

import {
  authenticate
} from '../middleware/auth';

const router = Router();

router.use(authenticate);

// CREATE
router.post(
  '/',
  AttributeController.create
);

// LIST
router.get(
  '/',
  AttributeController.index
);

// DELETE
router.delete(
  '/:uuid',
  AttributeController.destroy
);

export default router;