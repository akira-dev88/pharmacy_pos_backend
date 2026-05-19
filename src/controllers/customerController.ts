import type { Request, Response } from 'express';
import { CustomerModel } from '../models/Customer';
import type { AuthRequest } from '../middleware/auth';

export class CustomerController {
  // Create new customer
  static store = (req: AuthRequest, res: Response): void => {
    try {
      const { name, mobile, address, gstin, credit_limit } = req.body;

      if (!name) {
        res.status(400).json({ 
          success: false, 
          error: 'Name is required' 
        });
        return;
      }

      // Check if mobile already exists
      if (mobile) {
        const existingCustomer = CustomerModel.findByMobile(String(mobile));
        if (existingCustomer) {
          res.status(400).json({ 
            success: false, 
            error: 'Customer with this mobile number already exists' 
          });
          return;
        }
      }

      const customer = CustomerModel.create({
        name: String(name),
        mobile: mobile ? String(mobile) : undefined,
        address: address ? String(address) : undefined,
        gstin: gstin ? String(gstin) : undefined,
        credit_limit: credit_limit ? Number(credit_limit) : undefined,
      });

      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // List all customers
  static index = (req: AuthRequest, res: Response): void => {
    try {
      const customers = CustomerModel.findAll();

      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error('List customers error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Search customers
  static search = (req: Request, res: Response): void => {
    try {
      const query = String(req.query.q || '');
      
      if (!query) {
        res.status(400).json({ 
          success: false, 
          error: 'Search query is required' 
        });
        return;
      }

      const customers = CustomerModel.search(query);

      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Get customer ledger
  static ledger = (req: Request, res: Response): void => {
    try {
      const customerUuid = String(req.params.customer_uuid);
      const customer = CustomerModel.findById(customerUuid);

      if (!customer) {
        res.status(404).json({ 
          success: false, 
          error: 'Customer not found' 
        });
        return;
      }

      const ledger = CustomerModel.getLedger(customerUuid);

      res.json({
        success: true,
        data: ledger
      });
    } catch (error) {
      console.error('Get ledger error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Update customer
  static update = (req: AuthRequest, res: Response): void => {
    try {
      const customerUuid = String(req.params.customer_uuid);
      const { name, mobile, address, gstin, credit_limit } = req.body;

      const customer = CustomerModel.update(customerUuid, {
        name: name ? String(name) : undefined,
        mobile: mobile !== undefined ? String(mobile) : undefined,
        address: address !== undefined ? String(address) : undefined,
        gstin: gstin !== undefined ? String(gstin) : undefined,
        credit_limit: credit_limit !== undefined ? Number(credit_limit) : undefined,
      });

      if (!customer) {
        res.status(404).json({ 
          success: false, 
          error: 'Customer not found' 
        });
        return;
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Delete customer
  static destroy = (req: AuthRequest, res: Response): void => {
    try {
      const customerUuid = String(req.params.customer_uuid);
      const deleted = CustomerModel.delete(customerUuid);

      if (!deleted) {
        res.status(404).json({ 
          success: false, 
          error: 'Customer not found' 
        });
        return;
      }

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Get customer summary
  static summary = (req: AuthRequest, res: Response): void => {
    try {
      const summary = CustomerModel.getSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get summary error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Get aging report
  static aging = (req: AuthRequest, res: Response): void => {
    try {
      const agingData = CustomerModel.getAging();

      res.json({
        success: true,
        data: agingData
      });
    } catch (error) {
      console.error('Get aging error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };

  // Get payment reminders
  static reminders = (req: AuthRequest, res: Response): void => {
    try {
      const reminders = CustomerModel.getReminders();

      res.json({
        success: true,
        data: reminders
      });
    } catch (error) {
      console.error('Get reminders error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  };
}
