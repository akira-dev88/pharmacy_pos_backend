import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
  MedicineReturn,
  CreateMedicineReturnInput
} from '../types';

import {
  ProductBatchModel
} from './ProductBatch';

import {
  AuditLogModel
} from './AuditLog';

export class MedicineReturnModel {

  // =========================
  // CREATE RETURN
  // =========================

  static create(
    input: CreateMedicineReturnInput
  ): MedicineReturn {

    const returnUuid = uuidv4();

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
        expiry_date: string;
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

      // =========================
      // EXPIRED BLOCK
      // =========================

      const today = new Date()
        .toISOString()
        .split('T')[0];

      if (
        batch.expiry_date <= today
      ) {

        throw new Error(
          'Expired medicine cannot be restored'
        );
      }

      // =========================
      // QUARANTINE BLOCK
      // =========================

      if (
        Number(batch.is_quarantined) === 1
      ) {

        throw new Error(
          'Quarantined batch cannot accept returns'
        );
      }

      // =========================
      // CUSTOMER RETURN VALIDATION
      // =========================

      if (
        input.return_type ===
        'customer_return'
      ) {

        if (!input.sale_uuid) {

          throw new Error(
            'sale_uuid required'
          );
        }

        // =========================
        // SOLD QTY
        // =========================

        const sold = db.prepare(`

          SELECT

            COALESCE(
              SUM(quantity),
              0
            ) as sold_qty

          FROM sale_items

          WHERE

            sale_uuid = ?

            AND product_uuid = ?
        `).get(

          input.sale_uuid,

          input.product_uuid

        ) as {
          sold_qty: number;
        };

        if (
          Number(sold.sold_qty) <= 0
        ) {

          throw new Error(
            'Medicine not found in sale'
          );
        }

        // =========================
        // ALREADY RETURNED
        // =========================

        const returned = db.prepare(`

          SELECT

            COALESCE(
              SUM(quantity),
              0
            ) as returned_qty

          FROM medicine_returns

          WHERE

            sale_uuid = ?

            AND product_uuid = ?

            AND return_type =
              'customer_return'
        `).get(

          input.sale_uuid,

          input.product_uuid

        ) as {
          returned_qty: number;
        };

        const remainingReturnable =

          Number(sold.sold_qty)

          -

          Number(returned.returned_qty);

        if (
          input.quantity >
          remainingReturnable
        ) {

          throw new Error(
            'Return quantity exceeds sold quantity'
          );
        }
      }

      // =========================
      // RESTORE STOCK
      // =========================

      ProductBatchModel.updateQuantity(
        input.batch_uuid,
        input.quantity,
        'add'
      );

      // =========================
      // CREATE RETURN RECORD
      // =========================

      db.prepare(`

        INSERT INTO medicine_returns (

          return_uuid,

          sale_uuid,

          product_uuid,

          batch_uuid,

          return_type,

          quantity,

          refund_amount,

          reason,

          performed_by

        ) VALUES (

          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(

        returnUuid,

        input.sale_uuid || null,

        input.product_uuid,

        input.batch_uuid,

        input.return_type,

        input.quantity,

        input.refund_amount || 0,

        input.reason || null,

        input.performed_by || null
      );

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

        input.quantity,

        'return',

        returnUuid,

        `${input.return_type} processed`
      );

      // =========================
      // PAYMENT REFUND ENTRY
      // =========================

      if (

        input.return_type ===
        'customer_return'

        &&

        input.refund_amount

        &&

        input.refund_amount > 0

        &&

        input.sale_uuid
      ) {

        db.prepare(`

      INSERT INTO payments (

        sale_uuid,

        method,

        amount

      ) VALUES (

        ?, ?, ?
      )
    `).run(

          input.sale_uuid,

          'refund',

          -Math.abs(
            input.refund_amount
          )
        );
      }

      // =========================
      // RECALCULATE STOCK
      // =========================

      ProductBatchModel.recalculateProductStock(
        input.product_uuid
      );
    });

    transaction();
    
    AuditLogModel.create({

      action_type:
        input.return_type ===
          'customer_return'

          ? 'customer_return'

          : 'supplier_return',

      entity_type:
        'medicine_return',

      entity_uuid:
        returnUuid,

      reference_uuid:
        input.sale_uuid,

      user_uuid:
        input.performed_by,

      details: JSON.stringify({

        product_uuid:
          input.product_uuid,

        batch_uuid:
          input.batch_uuid,

        quantity:
          input.quantity,

        refund_amount:
          input.refund_amount
      })
    });

    return this.findById(
      returnUuid
    )!;
  }

  // =========================
  // FIND BY ID
  // =========================

  static findById(
    uuid: string
  ): MedicineReturn | undefined {

    const stmt = db.prepare(`

      SELECT *

      FROM medicine_returns

      WHERE return_uuid = ?
    `);

    return stmt.get(
      uuid
    ) as MedicineReturn | undefined;
  }

  // =========================
  // LIST
  // =========================

  static findAll(): MedicineReturn[] {

    const stmt = db.prepare(`

      SELECT *

      FROM medicine_returns

      ORDER BY created_at DESC
    `);

    return stmt.all() as MedicineReturn[];
  }
}