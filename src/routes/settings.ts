import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ✅ Public routes — no auth needed
router.get('/license/status', SettingsController.licenseStatus);
router.post('/license/activate', SettingsController.activateLicense);

// All settings routes require authentication
router.use(authenticate);

// GET settings (any authenticated user)
router.get('/', SettingsController.get);

// POST save settings (owner only)
router.post('/', authorize('owner'), SettingsController.save);

// PUT update settings (owner only)
router.put('/', authorize('owner'), SettingsController.update);

// Additional routes for backup management (owner only)
router.post('/backup', authorize('owner'), SettingsController.backup);
router.get('/backups', authorize('owner'), SettingsController.listBackups);
router.post('/restore', authorize('owner'), SettingsController.restore);
router.post('/test-print', authorize('owner'), SettingsController.testPrint);

export default router;
