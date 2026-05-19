import { Router } from 'express';
import { StaffController } from '../controllers/staffController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All staff routes require authentication and owner role
router.use(authenticate);
router.use(authorize('owner')); // Only owner can manage staff

// Summary before parameterized routes
router.get('/summary', StaffController.summary);
router.get('/role/:role', StaffController.byRole);

// Staff CRUD
router.get('/', StaffController.index);
router.post('/', StaffController.store);
router.put('/:user_uuid', StaffController.update);
router.delete('/:user_uuid', StaffController.destroy);

export default router;
