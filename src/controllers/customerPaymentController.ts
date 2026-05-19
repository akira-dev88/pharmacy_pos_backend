import type { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';
import type { AuthRequest } from '../middleware/auth';

export class CustomerPaymentController {
  // Record customer payment
  static store = (req: AuthRequest, res: Response): void => {
    try {
      const customerUuid = String(req.params.customer_uuid);
      const { amount, method } = req.body;

      // Validation
      if (!amount || !method) {
        res.status(400).json({ 
          success: false, 
          error: 'Amount and payment method are required' 
        });
        return;
      }

      const paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Amount must be a positive number' 
        });
        return;
      }

      // Check if customer exists
      const customer = CustomerModel.findById(customerUuid);
      if (!customer) {
        res.status(404).json({ 
          success: false, 
          error: 'Customer not found' 
        });
        return;
      }

      // Check if payment amount exceeds credit balance
      if (paymentAmount > customer.credit_balance) {
        res.status(400).json({ 
          success: false, 
          error: `Payment amount exceeds credit balance. Current balance: ${customer.credit_balance}` 
        });
        return;
      }

      // Record payment
      const result = CustomerModel.recordPayment(customerUuid, paymentAmount, String(method));

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: result
      });
    } catch (error) {
      console.error('Record payment error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };
}
