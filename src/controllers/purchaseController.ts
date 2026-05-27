import type {
  Response
} from 'express';

import {
  PurchaseModel
} from '../models/Purchase';

import {
  SupplierModel
} from '../models/Supplier';

import type {
  AuthRequest
} from '../middleware/auth';

export class PurchaseController {

  // =========================
  // CREATE PURCHASE
  // =========================

  static store = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const {
        supplier_uuid,
        items
      } = req.body;

      // VALIDATE ITEMS

      if (
        !items ||
        !Array.isArray(items) ||
        items.length === 0
      ) {

        res.status(400).json({
          error:
            'Items are required and must be a non-empty array'
        });
        return;
      }

      // VALIDATE SUPPLIER

      if (supplier_uuid) {

        const supplier =
          SupplierModel.findById(
            String(supplier_uuid)
          );

        if (!supplier) {
          res.status(400).json({
            error:
              'Supplier not found'
          });
          return;
        }
      }

      // VALIDATE EACH ITEM

      for (
        let i = 0;
        i < items.length;
        i++
      ) {

        const item = items[i];

        if (!item.product_uuid) {
          res.status(400).json({
            error:
              `Item ${i + 1}: product_uuid is required`
          });
          return;
        }

        if (!item.unit_uuid) {

          res.status(400).json({
            error:
              `Item ${i + 1}: unit_uuid is required`
          });

          return;
        }

        if (
          item.quantity === undefined ||
          Number(item.quantity) <= 0
        ) {

          res.status(400).json({
            error:
              `Item ${i + 1}: quantity must be greater than 0`
          });

          return;
        }

        if (
          item.cost_price === undefined ||
          Number(item.cost_price) < 0
        ) {

          res.status(400).json({
            error:
              `Item ${i + 1}: cost_price invalid`
          });

          return;
        }

        if (!item.batch_number) {

          res.status(400).json({
            error:
              `Item ${i + 1}: batch_number required`
          });

          return;
        }

        if (!item.expiry_date) {

          res.status(400).json({
            error:
              `Item ${i + 1}: expiry_date required`
          });
          return;
        }

        if (
          item.mrp === undefined
        ) {

          res.status(400).json({
            error:
              `Item ${i + 1}: mrp required`
          });
          return;
        }
      }

      // SANITIZE ITEMS

      const sanitizedItems =
        items.map((item: any) => ({

          product_uuid:
            String(item.product_uuid),

          unit_uuid:
            String(item.unit_uuid),

          batch_number:
            String(item.batch_number),

          expiry_date:
            String(item.expiry_date),

          manufacture_date:
            item.manufacture_date
              ? String(item.manufacture_date)
              : undefined,

          quantity:
            Number(item.quantity),

          free_quantity:
            item.free_quantity !== undefined
              ? Number(item.free_quantity)
              : 0,

          mrp:
            Number(item.mrp),

          ptr:
            item.ptr !== undefined
              ? Number(item.ptr)
              : 0,

          rate:
            item.rate !== undefined
              ? Number(item.rate)
              : 0,

          cost_price:
            Number(item.cost_price),

          selling_price:
            item.selling_price !== undefined
              ? Number(item.selling_price)
              : Number(item.mrp),

          gst_percent:
            item.gst_percent !== undefined
              ? Number(item.gst_percent)
              : 0
        }));

      // CREATE PURCHASE

      console.log(
        JSON.stringify(req.body, null, 2)
      );

      const purchase =
        PurchaseModel.create({

          supplier_uuid:
            supplier_uuid
              ? String(supplier_uuid)
              : undefined,

          items:
            sanitizedItems
        });

      res.status(201).json({
        success: true,

        message:
          'Purchase created',

        data:
          purchase
      });
    } catch (error: any) {

      console.error(
        'Create purchase error:',
        error
      );

      if (
        error.message &&
        error.message.includes(
          'not found'
        )
      ) {

        res.status(404).json({
          error:
            error.message
        });

        return;
      }

      res.status(500).json({
        error:
          'Internal server error'
      });
    }
  };

  // =========================
  // LIST PURCHASES
  // =========================

  static index = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const purchases =
        PurchaseModel.findAll();

      res.json(purchases);

    } catch (error) {

      console.error(
        'List purchases error:',
        error
      );

      res.status(500).json({
        error:
          'Internal server error'
      });
    }
  };
}
