import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { CustomerPaymentController } from '../controllers/customerPaymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

// Customer CRUD
router.post('/', CustomerController.store);
router.get('/', CustomerController.index);

// Search (before parameterized routes)
router.get('/search', CustomerController.search);
router.get('/summary', CustomerController.summary);
router.get('/aging', CustomerController.aging);
router.get('/reminders', CustomerController.reminders);

// Parameterized routes
router.get('/:customer_uuid', (req, res) => {
  // Get single customer
  const { CustomerModel } = require('../models/Customer');
  const customer = CustomerModel.findById(String(req.params.customer_uuid));
  if (!customer) {
    res.status(404).json({ success: false, error: 'Customer not found' });
    return;
  }
  res.json({ success: true, data: customer });
});

router.put('/:customer_uuid', CustomerController.update);
router.delete('/:customer_uuid', CustomerController.destroy);

// Ledger
router.get('/:customer_uuid/ledger', CustomerController.ledger);

// Payment
router.post('/:customer_uuid/payments', CustomerPaymentController.store);

export default router;
