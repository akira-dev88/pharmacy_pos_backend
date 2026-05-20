import type {
  Request,
  Response
} from 'express';

import {
  H1RegisterModel
} from '../models/H1Register';

export class H1RegisterController {

  // =========================
  // LIST ALL
  // =========================

  static getAll(
    req: Request,
    res: Response
  ): void {

    try {

      const records =
        H1RegisterModel.findAll();

      res.json({

        success: true,

        data: records
      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch H1 register'
      });
    }
  }

  // =========================
  // DATE FILTER
  // =========================

  static getByDateRange(
    req: Request,
    res: Response
  ): void {

    try {

      const {
        from,
        to
      } = req.query;

      if (!from || !to) {

        res.status(400).json({

          success: false,

          error:
            'from and to dates required'
        });

        return;
      }

      const records =
        H1RegisterModel.findByDateRange(
          String(from),
          String(to)
        );

      res.json({

        success: true,

        data: records
      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch H1 register'
      });
    }
  }
}