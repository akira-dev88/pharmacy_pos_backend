import db from '../database/connection';

import { v4 as uuidv4 } from 'uuid';

import type {
  ProductBatch,
  ProductBatchCreateInput
} from '../types';

import { ProductModel } from './Product';

export class ProductBatchModel {

  // =========================
  // CREATE BATCH
  // =========================

  static create(
    input: ProductBatchCreateInput
  ): ProductBatch {

    const batchUuid = uuidv4();

    const today = new Date()
      .toISOString()
      .split('T')[0];

    if (input.expiry_date <= today) {
      throw new Error(
        'Expired batch cannot be added'
      );
    }

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

    this.recalculateProductStock(
      input.product_uuid
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

  // =========================
  // RECALCULATE PRODUCT STOCK
  // =========================

  static recalculateProductStock(
    product_uuid: string
  ): void {

    const stmt = db.prepare(`

    SELECT
      COALESCE(SUM(quantity), 0) as total

    FROM product_batches

    WHERE product_uuid = ?
  `);

    const result = stmt.get(
      product_uuid
    ) as any;

    db.prepare(`

    UPDATE products

    SET
      stock = ?,
      updated_at = CURRENT_TIMESTAMP

    WHERE product_uuid = ?
  `).run(
      result.total,
      product_uuid
    );
  }

  // =========================
  // UPDATE BATCH QUANTITY
  // =========================

  static updateQuantity(
    batch_uuid: string,
    quantity: number,
    operation: 'add' | 'subtract'
  ): ProductBatch | undefined {

    const batch =
      this.findById(batch_uuid);

    if (!batch) return undefined;

    const newQuantity =
      operation === 'add'
        ? batch.quantity + quantity
        : batch.quantity - quantity;

    if (newQuantity < 0) {
      throw new Error(
        'Insufficient batch stock'
      );
    }

    db.prepare(`

    UPDATE product_batches

    SET
      quantity = ?,
      updated_at = CURRENT_TIMESTAMP

    WHERE batch_uuid = ?
  `).run(
      newQuantity,
      batch_uuid
    );

    this.recalculateProductStock(
      batch.product_uuid
    );

    return this.findById(batch_uuid);
  }

  // =========================
  // CONSUME STOCK (FEFO)
  // =========================

  static consumeStockFEFO(
    product_uuid: string,
    quantity: number
  ): {
    batch_uuid: string;
    quantity: number;
  }[] {

    const batches =
      this.getAvailableBatches(
        product_uuid
      );

    let remaining = quantity;

    const consumed: {
      batch_uuid: string;
      quantity: number;
    }[] = [];

    for (const batch of batches) {

      if (remaining <= 0) {
        break;
      }

      const deductQty =
        Math.min(
          batch.quantity,
          remaining
        );

      // REDUCE BATCH

      this.updateQuantity(
        batch.batch_uuid,
        deductQty,
        'subtract'
      );

      consumed.push({

        batch_uuid: batch.batch_uuid,

        quantity: deductQty
      });

      remaining -= deductQty;
    }

    if (remaining > 0) {

      throw new Error(
        'Insufficient stock across batches'
      );
    }

    return consumed;
  }

}