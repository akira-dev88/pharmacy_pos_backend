import type { Request, Response } from 'express';
import { PurchaseModel } from '../models/Purchase';
import { SupplierModel } from '../models/Supplier';
import type { AuthRequest } from '../middleware/auth';

export class PurchaseController {
  // Create new purchase
  static store = (req: AuthRequest, res: Response): void => {
    try {
      const { supplier_uuid, items } = req.body;

      // Validation matching PHP
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          error: 'Items are required and must be a non-empty array'
        });
        return;
      }

      // Validate supplier if provided
      if (supplier_uuid) {
        const supplier = SupplierModel.findById(String(supplier_uuid));
        if (!supplier) {
          res.status(400).json({
            error: 'Supplier not found'
          });
          return;
        }
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (!item.product_uuid) {
          res.status(400).json({
            error: `Item ${i + 1}: product_uuid is required`
          });
          return;
        }

        if (!item.quantity || Number(item.quantity) < 1) {
          res.status(400).json({
            error: `Item ${i + 1}: quantity must be at least 1`
          });
          return;
        }

        if (item.cost_price === undefined || Number(item.cost_price) < 0) {
          res.status(400).json({
            error: `Item ${i + 1}: cost_price must be 0 or greater`
          });
          return;
        }
      }

      // Sanitize items
      const sanitizedItems = items.map((item: any) => ({
        product_uuid: String(item.product_uuid),
        quantity: parseInt(String(item.quantity)),
        cost_price: parseFloat(String(item.cost_price))
      }));

      const purchase = PurchaseModel.create({
        supplier_uuid: supplier_uuid ? String(supplier_uuid) : undefined,
        items: sanitizedItems
      });

      res.status(201).json({
        success: true,
        message: 'Purchase created',
        data: purchase
      });
    } catch (error: any) {
      console.error('Create purchase error:', error);
      
      // Check for specific error types
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // List all purchases
  static index = (req: AuthRequest, res: Response): void => {
    try {
      const purchases = PurchaseModel.findAll();

      res.json(purchases); // Direct JSON response like PHP
    } catch (error) {
      console.error('List purchases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
