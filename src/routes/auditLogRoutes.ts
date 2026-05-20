import {
  Router
} from 'express';

import {
  AuditLogController
} from '../controllers/AuditLogController';

const router = Router();

router.get(
  '/',
  AuditLogController.getAll
);

export default router;