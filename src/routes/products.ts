import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// CRUD operations
router.post('/', ProductController.create);
router.get('/', ProductController.index);
// router.post('/bulk', ProductController.bulkCreate); // Bulk create before :uuid to avoid conflict

// Search and lookup routes (before parameterized routes)
router.get('/search', ProductController.search);
router.get('/low-stock', ProductController.lowStock);
// router.get('/barcode/:barcode', ProductController.findByBarcode);
// router.get('/sku/:sku', ProductController.findBySku);

// Parameterized routes
router.get('/:uuid', ProductController.show);
router.put('/:uuid', ProductController.update);
router.delete('/:uuid', ProductController.destroy);

export default router;
