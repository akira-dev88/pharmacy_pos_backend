import type {
  Request,
  Response
} from 'express';

import type {
  AuthRequest
} from '../middleware/auth';

import {
  MedicineReturnModel
} from '../models/MedicineReturn';

export class MedicineReturnController {

  // =========================
  // CREATE
  // =========================

  static create = (
    req: AuthRequest,
    res: Response
  ): void => {

    try {

      const {

        sale_uuid,

        product_uuid,

        batch_uuid,

        return_type,

        quantity,

        refund_amount,

        reason

      } = req.body;

      if (
        !product_uuid ||
        !batch_uuid ||
        !return_type ||
        quantity === undefined
      ) {

        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });

        return;
      }

      const result =
        MedicineReturnModel.create({

          sale_uuid,

          product_uuid,

          batch_uuid,

          return_type,

          quantity: Number(quantity),

          refund_amount:
            Number(refund_amount || 0),

          reason,

          performed_by:
            req.user?.user_uuid
        });

      res.status(201).json({
        success: true,
        data: result
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
        MedicineReturnModel.findAll();

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