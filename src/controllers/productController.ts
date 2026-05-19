// controllers/ProductController.ts

import type {
  Request,
  Response
} from 'express';

import { ProductModel } from '../models/Product';
import type { AuthRequest } from '../middleware/auth';

export class ProductController {


  private static getString(
    value: unknown
  ): string {

    if (Array.isArray(value)) {
      return String(value[0] || '');
    }

    return String(value || '');
  }

  // =========================
  // CREATE
  // =========================

  static create = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const {
        name,
        category_uuid,
        subcategory,
        barcode,
        sku,
        unit,
        price,
        purchase_price,
        gst_percent,
        stock,
        hsn_code,
        image,
        attributes
      } = req.body;

      if (!name || price === undefined) {

        res.status(400).json({
          success: false,
          error: 'Name and price required'
        });

        return;
      }

      // BARCODE CHECK

      if (barcode) {

        const existing =
          ProductModel.findByBarcode(barcode);

        if (existing) {

          res.status(400).json({
            success: false,
            error: 'Barcode already exists'
          });

          return;
        }
      }

      // SKU CHECK

      if (sku) {

        const existing =
          ProductModel.findBySku(sku);

        if (existing) {

          res.status(400).json({
            success: false,
            error: 'SKU already exists'
          });

          return;
        }
      }

      const product = ProductModel.create({

        name,

        category_uuid,
        subcategory,

        barcode,
        sku,

        unit,

        price: Number(price),

        purchase_price:
          purchase_price !== undefined
            ? Number(purchase_price)
            : undefined,

        gst_percent:
          gst_percent !== undefined
            ? Number(gst_percent)
            : undefined,

        stock:
          stock !== undefined
            ? Number(stock)
            : undefined,

        hsn_code,
        image,

        attributes
      });

      res.status(201).json({
        success: true,
        data: product
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // LIST
  // =========================

  static index = (
    req: Request,
    res: Response
  ): void => {

    try {

      const page =
        Number(req.query.page || 1);

      const limit =
        Number(req.query.limit || 20);

      const data =
        ProductModel.findAll(page, limit);

      res.json({
        success: true,
        ...data
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // SHOW
  // =========================

  static show = (
    req: Request,
    res: Response
  ): void => {

    try {

      const uuid =
        this.getString(req.params.uuid);

      const product =
        ProductModel.findById(uuid);

      if (!product) {

        res.status(404).json({
          success: false,
          error: 'Product not found'
        });

        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // SEARCH
  // =========================

  static search = (
    req: Request,
    res: Response
  ): void => {

    try {

      const q =
        this.getString(req.query.q);

      if (!q) {

        res.status(400).json({
          success: false,
          error: 'Search query required'
        });

        return;
      }

      const products =
        ProductModel.search(q);

      res.json({
        success: true,
        count: products.length,
        data: products
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // UPDATE
  // =========================

  static update = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const product =
        ProductModel.update(
          this.getString(req.params.uuid),
          req.body
        );

      if (!product) {

        res.status(404).json({
          success: false,
          error: 'Product not found'
        });

        return;
      }

      res.json({
        success: true,
        data: product
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // DELETE
  // =========================

  static destroy = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const deleted =
        ProductModel.delete(
          this.getString(req.params.uuid)
        );

      if (!deleted) {

        res.status(404).json({
          success: false,
          error: 'Product not found'
        });

        return;
      }

      res.json({
        success: true,
        message: 'Deleted successfully'
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // =========================
  // LOW STOCK
  // =========================

  static lowStock = (
    req: Request,
    res: Response
  ): void => {

    try {

      const threshold =
        Number(req.query.threshold || 10);

      const products =
        ProductModel.getLowStock(
          threshold
        );

      res.json({
        success: true,
        data: products
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}