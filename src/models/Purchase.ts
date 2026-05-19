import db from '../database/connection';

import type {
  Purchase,
  PurchaseItem,
  PurchaseWithRelations
} from '../types/index';

import { v4 as uuidv4 } from 'uuid';

import {
  ProductBatchModel
} from './ProductBatch';

export class PurchaseModel {

  // =========================
  // CREATE PURCHASE
  // =========================

  static create(data: {
    supplier_uuid?: string;
    items: Array<{
      product_uuid: string;
      batch_number: string;
      expiry_date: string;
      manufacture_date?: string;
      quantity: number;
      free_quantity?: number;
      mrp: number;
      ptr?: number;
      rate?: number;
      cost_price: number;
      selling_price?: number;
      gst_percent?: number;
    }>;
  }): PurchaseWithRelations {
    const purchaseUuid = uuidv4();
    let total = 0;

    const transaction = db.transaction(() => {

      // CREATE PURCHASE

      db.prepare(`

        INSERT INTO purchases (

          purchase_uuid,
          total,
          supplier_uuid

        ) VALUES (?, 0, ?)

      `).run(
        purchaseUuid,
        data.supplier_uuid || null
      );

      // INSERT PURCHASE ITEM

      const insertItem = db.prepare(`

        INSERT INTO purchase_items (

          purchase_uuid,

          product_uuid,

          batch_number,

          expiry_date,

          manufacture_date,

          quantity,

          free_quantity,

          mrp,

          ptr,

          rate,

          cost_price,

          selling_price,

          gst_percent

        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

      `);

      // STOCK LEDGER

      const insertStockLedger = db.prepare(`

        INSERT INTO stock_ledgers (

          product_uuid,
          quantity,
          type,
          reference_uuid,
          note

        ) VALUES (

          ?, ?, 'purchase', ?, 'Stock added via purchase'
        )

      `);

      // PROCESS ITEMS

      for (const item of data.items) {

        // CHECK PRODUCT

        const product = db.prepare(`

          SELECT *
          FROM products
          WHERE product_uuid = ?

        `).get(
          item.product_uuid
        ) as any;

        if (!product) {

          throw new Error(
            `Product not found: ${item.product_uuid}`
          );
        }

        const quantity =
          Number(item.quantity);

        const costPrice =
          Number(item.cost_price);

        // INSERT PURCHASE ITEM

        insertItem.run(

          purchaseUuid,

          item.product_uuid,

          item.batch_number,

          item.expiry_date,

          item.manufacture_date || null,

          quantity,

          item.free_quantity || 0,

          item.mrp,

          item.ptr || 0,

          item.rate || 0,

          costPrice,

          item.selling_price || item.mrp,

          item.gst_percent || 0
        );

        // AUTO CREATE BATCH

        ProductBatchModel.create({

          product_uuid:
            item.product_uuid,

          batch_number:
            item.batch_number,

          expiry_date:
            item.expiry_date,

          manufacture_date:
            item.manufacture_date,

          mrp:
            item.mrp,

          ptr:
            item.ptr,

          rate:
            item.rate,

          purchase_price:
            costPrice,

          selling_price:
            item.selling_price || item.mrp,

          gst_percent:
            item.gst_percent || 0,

          quantity:
            quantity,

          free_quantity:
            item.free_quantity || 0,

          supplier_uuid:
            data.supplier_uuid,

          purchase_uuid:
            purchaseUuid
        });

        // STOCK LEDGER

        insertStockLedger.run(

          item.product_uuid,

          quantity,

          purchaseUuid
        );

        // CALCULATE TOTAL

        total +=
          quantity * costPrice;
      }

      // UPDATE TOTAL

      db.prepare(`

        UPDATE purchases

        SET
          total = ?,
          updated_at = CURRENT_TIMESTAMP

        WHERE purchase_uuid = ?

      `).run(

        Math.round(total * 100) / 100,

        purchaseUuid
      );

      return purchaseUuid;
    });

    transaction();

    return this.findWithRelations(
      purchaseUuid
    )!;
  }

  // =========================
  // FIND PURCHASE
  // =========================

  static findById(
    uuid: string
  ): Purchase | undefined {

    return db.prepare(`

      SELECT *
      FROM purchases
      WHERE purchase_uuid = ?

    `).get(uuid) as Purchase | undefined;
  }

  // =========================
  // PURCHASE WITH RELATIONS
  // =========================

  static findWithRelations(
    uuid: string
  ): PurchaseWithRelations | undefined {

    const purchase =
      this.findById(uuid);

    if (!purchase) {
      return undefined;
    }

    // PURCHASE ITEMS

    const items = db.prepare(`

      SELECT

        pi.*,

        p.name as product_name,

        p.barcode as product_barcode,

        p.sku as product_sku

      FROM purchase_items pi

      LEFT JOIN products p
      ON pi.product_uuid = p.product_uuid

      WHERE pi.purchase_uuid = ?

    `).all(uuid) as any[];

    // SUPPLIER

    let supplier: any = null;

    if (purchase.supplier_uuid) {

      supplier = db.prepare(`

        SELECT *
        FROM suppliers
        WHERE supplier_uuid = ?

      `).get(
        purchase.supplier_uuid
      ) as any;
    }

    // FORMAT ITEMS

    const formattedItems =
      items.map(item => ({

        id: item.id,

        purchase_uuid:
          item.purchase_uuid,

        product_uuid:
          item.product_uuid,

        batch_number:
          item.batch_number,

        expiry_date:
          item.expiry_date,

        manufacture_date:
          item.manufacture_date,

        quantity:
          item.quantity,

        free_quantity:
          item.free_quantity,

        mrp:
          item.mrp,

        ptr:
          item.ptr,

        rate:
          item.rate,

        cost_price:
          item.cost_price,

        selling_price:
          item.selling_price,

        gst_percent:
          item.gst_percent,

        created_at:
          item.created_at,

        updated_at:
          item.updated_at,

        product: {

          product_uuid:
            item.product_uuid,

          name:
            item.product_name,

          barcode:
            item.product_barcode,

          sku:
            item.product_sku
        }
      }));

    return {

      ...purchase,

      items:
        formattedItems,

      supplier
    };
  }

  // =========================
  // FIND ALL
  // =========================

  static findAll():
    PurchaseWithRelations[] {

    const purchases = db.prepare(`

      SELECT *
      FROM purchases

      ORDER BY created_at DESC

    `).all() as Purchase[];

    return purchases.map(p =>
      this.findWithRelations(
        p.purchase_uuid
      )!
    );
  }

  // =========================
  // FIND BY SUPPLIER
  // =========================

  static findBySupplier(
    supplierUuid: string
  ): PurchaseWithRelations[] {

    const purchases = db.prepare(`

      SELECT *
      FROM purchases

      WHERE supplier_uuid = ?

      ORDER BY created_at DESC

    `).all(
      supplierUuid
    ) as Purchase[];

    return purchases.map(p =>
      this.findWithRelations(
        p.purchase_uuid
      )!
    );
  }

  // =========================
  // GET ITEMS
  // =========================

  static getItems(
    purchaseUuid: string
  ): PurchaseItem[] {

    return db.prepare(`

      SELECT *
      FROM purchase_items

      WHERE purchase_uuid = ?

    `).all(
      purchaseUuid
    ) as PurchaseItem[];
  }

  // =========================
  // UPDATE PURCHASE
  // =========================

  static update(
    uuid: string,
    data: {

      supplier_uuid?: string;

      total?: number;
    }

  ): Purchase | undefined {

    const purchase =
      this.findById(uuid);

    if (!purchase) {
      return undefined;
    }

    const updateFields:
      string[] = [];

    const values:
      any[] = [];

    if (
      data.supplier_uuid !== undefined
    ) {

      updateFields.push(
        'supplier_uuid = ?'
      );

      values.push(
        data.supplier_uuid
      );
    }

    if (
      data.total !== undefined
    ) {

      updateFields.push(
        'total = ?'
      );

      values.push(
        data.total
      );
    }

    if (updateFields.length > 0) {

      updateFields.push(
        'updated_at = CURRENT_TIMESTAMP'
      );

      values.push(uuid);

      db.prepare(`

        UPDATE purchases

        SET ${updateFields.join(', ')}

        WHERE purchase_uuid = ?

      `).run(...values);
    }

    return this.findById(uuid);
  }

  // =========================
  // DELETE PURCHASE
  // =========================

  static delete(
    uuid: string
  ): boolean {

    const purchase =
      this.findById(uuid);

    if (!purchase) {
      return false;
    }

    const transaction =
      db.transaction(() => {

        // GET BATCHES

        const batches = db.prepare(`

          SELECT *
          FROM product_batches

          WHERE purchase_uuid = ?

        `).all(uuid) as any[];

        // DELETE BATCHES

        for (const batch of batches) {

          db.prepare(`

            DELETE FROM product_batches

            WHERE batch_uuid = ?

          `).run(
            batch.batch_uuid
          );

          ProductBatchModel
            .recalculateProductStock(
              batch.product_uuid
            );

          // STOCK LEDGER

          db.prepare(`

            INSERT INTO stock_ledgers (

              product_uuid,
              quantity,
              type,
              reference_uuid,
              note

            ) VALUES (

              ?, ?, 'adjustment', ?, 'Purchase deleted - stock reversed'
            )

          `).run(

            batch.product_uuid,

            -batch.quantity,

            uuid
          );
        }

        // DELETE PURCHASE ITEMS

        db.prepare(`

          DELETE FROM purchase_items

          WHERE purchase_uuid = ?

        `).run(uuid);

        // DELETE PURCHASE

        const result = db.prepare(`

          DELETE FROM purchases

          WHERE purchase_uuid = ?

        `).run(uuid);

        return result.changes > 0;
      });

    return transaction();
  }
}
