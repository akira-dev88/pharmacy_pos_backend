import type {
  Request,
  Response
} from 'express';

import {
  AuditLogModel
} from '../models/AuditLog';

export class AuditLogController {

  static getAll(
    req: Request,
    res: Response
  ): void {

    try {

      const logs =
        AuditLogModel.findAll();

      res.json({

        success: true,

        data: logs
      });

    } catch (error) {

      res.status(500).json({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch audit logs'
      });
    }
  }
}