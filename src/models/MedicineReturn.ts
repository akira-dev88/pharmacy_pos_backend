import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
  MedicineReturn,
  CreateMedicineReturnInput
} from '../types';

import {
  ProductBatchModel
} from './ProductBatch';

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
      // EXPIRED RETURN BLOCK
      // =========================

      const today = new Date()
        .toISOString()
        .split('T')[0];

      if (
        batch.expiry_date <= today
      ) {
        throw new Error(
          'Expired medicine cannot be returned to saleable stock'
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
      // VALIDATE SALE ITEM
      // =========================

      if (
        input.return_type ===
        'customer_return'
      ) {

        if (
          !input.sale_uuid ||
          !input.sale_item_id
        ) {
          throw new Error(
            'Sale reference required'
          );
        }

        const saleItem = db.prepare(`

          SELECT *

          FROM sale_items

          WHERE

            id = ?

            AND sale_uuid = ?

            AND batch_uuid = ?
        `).get(

          input.sale_item_id,

          input.sale_uuid,

          input.batch_uuid

        ) as {
          quantity: number;
        } | undefined;

        if (!saleItem) {
          throw new Error(
            'Sale item not found'
          );
        }

        if (
          input.quantity >
          Number(saleItem.quantity)
        ) {
          throw new Error(
            'Return quantity exceeds sold quantity'
          );
        }
      }

      // =========================
      // RESTORE BATCH STOCK
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

          sale_item_id,

          product_uuid,

          batch_uuid,

          return_type,

          quantity,

          refund_amount,

          reason,

          performed_by

        ) VALUES (

          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(

        returnUuid,

        input.sale_uuid || null,

        input.sale_item_id || null,

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
      // PAYMENT REVERSAL
      // =========================

      if (
        input.return_type ===
        'customer_return'

        &&

        input.refund_amount

        &&

        input.refund_amount > 0
      ) {

        db.prepare(`

          INSERT INTO payments (

            payment_uuid,

            sale_uuid,

            method,

            amount,

            type,

            note

          ) VALUES (

            lower(hex(randomblob(16))),

            ?,

            'refund',

            ?,

            'refund',

            ?
          )
        `).run(

          input.sale_uuid,

          -Math.abs(
            input.refund_amount
          ),

          `Medicine return refund`
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