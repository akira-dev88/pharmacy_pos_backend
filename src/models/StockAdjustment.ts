import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
  StockAdjustment,
  CreateStockAdjustmentInput
} from '../types';

import { ProductBatchModel }
  from './ProductBatch';
import { AuditLogModel } from './AuditLog';

export class StockAdjustmentModel {

  // =========================
  // CREATE ADJUSTMENT
  // =========================

  static create(
    input: CreateStockAdjustmentInput
  ): StockAdjustment {

    const adjustmentUuid = uuidv4();

    const transaction = db.transaction(() => {

      // =========================
      // VALIDATE BATCH
      // =========================

      const batch = db.prepare(`

        SELECT *
        FROM product_batches
        WHERE batch_uuid = ?
      `).get(
        input.batch_uuid
      ) as {
        batch_uuid: string;
        product_uuid: string;
        quantity: number;
        is_quarantined: number;
      } | undefined;

      if (!batch) {
        throw new Error(
          'Batch not found'
        );
      }

      if (
        batch.product_uuid !==
        input.product_uuid
      ) {
        throw new Error(
          'Batch-product mismatch'
        );
      }

      if (input.quantity <= 0) {
        throw new Error(
          'Quantity must be greater than zero'
        );
      }

      if (
        Number(batch.quantity) <
        input.quantity
      ) {
        throw new Error(
          'Insufficient batch stock'
        );
      }

      // =========================
      // REDUCE BATCH STOCK
      // =========================

      ProductBatchModel.updateQuantity(
        input.batch_uuid,
        input.quantity,
        'subtract'
      );

      // =========================
      // AUTO QUARANTINE
      // =========================

      if (
        input.adjustment_type === 'expired'
      ) {

        db.prepare(`

          UPDATE product_batches

          SET

            is_quarantined = 1,

            updated_at = CURRENT_TIMESTAMP

          WHERE batch_uuid = ?
        `).run(
          input.batch_uuid
        );
      }

      // =========================
      // CREATE ADJUSTMENT RECORD
      // =========================

      db.prepare(`

        INSERT INTO stock_adjustments (

          adjustment_uuid,

          product_uuid,

          batch_uuid,

          adjustment_type,

          quantity,

          note,

          performed_by

        ) VALUES (

          ?, ?, ?, ?, ?, ?, ?
        )
      `).run(

        adjustmentUuid,

        input.product_uuid,

        input.batch_uuid,

        input.adjustment_type,

        input.quantity,

        input.note || null,

        input.performed_by || null
      );

      AuditLogModel.create({

        action_type:
          'stock_adjustment',

        entity_type:
          'stock_adjustment',

        entity_uuid:
          adjustmentUuid,

        user_uuid:
          input.performed_by,

        details: JSON.stringify({

          adjustment_type:
            input.adjustment_type,

          product_uuid:
            input.product_uuid,

          batch_uuid:
            input.batch_uuid,

          quantity:
            input.quantity
        })
      });

      // =========================
      // STOCK LEDGER
      // =========================

      db.prepare(`

        INSERT INTO stock_ledgers (

          product_uuid,

          quantity,

          type,

          reference_uuid,

          note

        ) VALUES (

          ?, ?, ?, ?, ?
        )
      `).run(

        input.product_uuid,

        -input.quantity,

        'adjustment',

        adjustmentUuid,

        `${input.adjustment_type} adjustment`
      );

      // =========================
      // RECALCULATE STOCK
      // =========================

      ProductBatchModel.recalculateProductStock(
        input.product_uuid
      );
    });

    transaction();

    return this.findById(
      adjustmentUuid
    )!;
  }

  // =========================
  // FIND BY ID
  // =========================

  static findById(
    uuid: string
  ): StockAdjustment | undefined {

    const stmt = db.prepare(`

      SELECT *
      FROM stock_adjustments
      WHERE adjustment_uuid = ?
    `);

    return stmt.get(
      uuid
    ) as StockAdjustment | undefined;
  }

  // =========================
  // LIST
  // =========================

  static findAll(): StockAdjustment[] {

    const stmt = db.prepare(`

      SELECT *
      FROM stock_adjustments

      ORDER BY created_at DESC
    `);

    return stmt.all() as StockAdjustment[];
  }
}