import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

// Match PHP routes exactly
router.get('/', SupplierController.index);
router.post('/', SupplierController.store);
router.put('/:supplier_uuid', SupplierController.update);
router.delete('/:supplier_uuid', SupplierController.destroy);

export default router;
