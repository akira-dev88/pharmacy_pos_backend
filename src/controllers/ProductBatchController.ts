import type {
  Request,
  Response
} from 'express';

import {
  ProductBatchModel
} from '../models/ProductBatch';

export class ProductBatchController {

  // =========================
  // CREATE BATCH
  // =========================

  static create = (
    req: Request,
    res: Response
  ): void => {

    try {

      const {

        product_uuid,

        batch_number,

        expiry_date,

        manufacture_date,

        mrp,

        ptr,

        rate,

        purchase_price,

        selling_price,

        gst_percent,

        quantity,

        free_quantity,

        supplier_uuid,

        purchase_uuid

      } = req.body;

      if (
        !product_uuid ||
        !batch_number ||
        !expiry_date ||
        mrp === undefined ||
        quantity === undefined
      ) {

        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });

        return;
      }

      const batch =
        ProductBatchModel.create({

          product_uuid,

          batch_number,

          expiry_date,

          manufacture_date,

          mrp: Number(mrp),

          ptr:
            ptr !== undefined
              ? Number(ptr)
              : undefined,

          rate:
            rate !== undefined
              ? Number(rate)
              : undefined,

          purchase_price:
            purchase_price !== undefined
              ? Number(purchase_price)
              : undefined,

          selling_price:
            selling_price !== undefined
              ? Number(selling_price)
              : undefined,

          gst_percent:
            gst_percent !== undefined
              ? Number(gst_percent)
              : undefined,

          quantity: Number(quantity),

          free_quantity:
            free_quantity !== undefined
              ? Number(free_quantity)
              : undefined,

          supplier_uuid,

          purchase_uuid
        });

      res.status(201).json({
        success: true,
        data: batch
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
  // GET PRODUCT BATCHES
  // =========================

  static getByProduct = (
    req: Request,
    res: Response
  ): void => {

    try {

      const product_uuid =
        String(req.params.product_uuid);

      const batches =
        ProductBatchModel.getByProduct(
          product_uuid
        );

      res.json({
        success: true,
        data: batches
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