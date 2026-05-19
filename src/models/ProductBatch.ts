import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
  ProductBatch,
  ProductBatchCreateInput
} from '../types';

export class ProductBatchModel {

  // =========================
  // CREATE BATCH
  // =========================

  static create(
    input: ProductBatchCreateInput
  ): ProductBatch {

    const batchUuid = uuidv4();

    const stmt = db.prepare(`

      INSERT INTO product_batches (

        batch_uuid,

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

      ) VALUES (

        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(

      batchUuid,

      input.product_uuid,

      input.batch_number,

      input.expiry_date,

      input.manufacture_date || null,

      input.mrp,

      input.ptr || 0,

      input.rate || 0,

      input.purchase_price || 0,

      input.selling_price || 0,

      input.gst_percent || 0,

      input.quantity,

      input.free_quantity || 0,

      input.supplier_uuid || null,

      input.purchase_uuid || null
    );

    return this.findById(batchUuid)!;
  }

  // =========================
  // FIND BY ID
  // =========================

  static findById(
    uuid: string
  ): ProductBatch | undefined {

    const stmt = db.prepare(`
      SELECT *
      FROM product_batches
      WHERE batch_uuid = ?
    `);

    return stmt.get(uuid) as ProductBatch;
  }

  // =========================
  // GET PRODUCT BATCHES
  // =========================

  static getByProduct(
    product_uuid: string
  ): ProductBatch[] {

    const stmt = db.prepare(`

      SELECT *
      FROM product_batches

      WHERE product_uuid = ?

      ORDER BY expiry_date ASC
    `);

    return stmt.all(product_uuid) as ProductBatch[];
  }

  // =========================
  // GET AVAILABLE BATCHES
  // =========================

  static getAvailableBatches(
    product_uuid: string
  ): ProductBatch[] {

    const stmt = db.prepare(`

      SELECT *
      FROM product_batches

      WHERE
        product_uuid = ?
        AND quantity > 0
        AND expiry_date > date('now')

      ORDER BY expiry_date ASC
    `);

    return stmt.all(product_uuid) as ProductBatch[];
  }
}