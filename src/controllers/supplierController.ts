import type { Request, Response } from 'express';
import { SupplierModel } from '../models/Supplier';
import type { AuthRequest } from '../middleware/auth';

export class SupplierController {
  // List all suppliers
  static index = (req: AuthRequest, res: Response): void => {
    try {
      const suppliers = SupplierModel.findAll();

      res.json(suppliers); // Direct JSON response like PHP
    } catch (error) {
      console.error('List suppliers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Create supplier
  static store = (req: AuthRequest, res: Response): void => {
    try {
      const { name, phone, email, address } = req.body;

      // Validation
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      // Optional email validation
      if (email && typeof email === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({ error: 'Invalid email format' });
          return;
        }
      }

      const supplier = SupplierModel.create({
        name: String(name),
        phone: phone ? String(phone) : null,
        email: email ? String(email) : null,
        address: address ? String(address) : null,
      });

      res.status(201).json(supplier); // Direct supplier response like PHP
    } catch (error) {
      console.error('Create supplier error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Update supplier
  static update = (req: AuthRequest, res: Response): void => {
    try {
      const supplierUuid = String(req.params.supplier_uuid);
      
      // Check if supplier exists
      const existingSupplier = SupplierModel.findById(supplierUuid);
      if (!existingSupplier) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      // Only update provided fields (like PHP's $request->only())
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = String(req.body.name);
      if (req.body.phone !== undefined) updates.phone = req.body.phone ? String(req.body.phone) : null;
      if (req.body.email !== undefined) updates.email = req.body.email ? String(req.body.email) : null;
      if (req.body.address !== undefined) updates.address = req.body.address ? String(req.body.address) : null;

      const supplier = SupplierModel.update(supplierUuid, updates);

      if (!supplier) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json(supplier); // Direct supplier response like PHP
    } catch (error) {
      console.error('Update supplier error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Delete supplier
  static destroy = (req: AuthRequest, res: Response): void => {
    try {
      const supplierUuid = String(req.params.supplier_uuid);
      
      // Check if supplier exists
      const existingSupplier = SupplierModel.findById(supplierUuid);
      if (!existingSupplier) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      const deleted = SupplierModel.delete(supplierUuid);

      if (!deleted) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json({ message: 'Deleted' }); // Matching PHP response format
    } catch (error) {
      console.error('Delete supplier error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
