import type {
  Request,
  Response
} from 'express';

import type {
  AuthRequest
} from '../middleware/auth';

import {
  StockAdjustmentModel
} from '../models/StockAdjustment';

export class StockAdjustmentController {

  // =========================
  // CREATE
  // =========================

  static create = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const {

        product_uuid,

        batch_uuid,

        adjustment_type,

        quantity,

        note

      } = req.body;

      if (
        !product_uuid ||
        !batch_uuid ||
        !adjustment_type ||
        quantity === undefined
      ) {

        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });

        return;
      }

      const adjustment =
        StockAdjustmentModel.create({

          product_uuid,

          batch_uuid,

          adjustment_type,

          quantity: Number(quantity),

          note,

          performed_by:
            req.user?.user_uuid
        });

      res.status(201).json({
        success: true,
        data: adjustment
      });

    } catch (error: any) {

      console.error(error);

      res.status(400).json({
        success: false,
        error: error.message
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

      const data =
        StockAdjustmentModel.findAll();

      res.json({
        success: true,
        count: data.length,
        data
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