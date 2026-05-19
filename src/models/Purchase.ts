import db from '../database/connection';
import type { Purchase, PurchaseItem, PurchaseWithRelations } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class PurchaseModel {
  // Create purchase with items
  static create(data: {
    supplier_uuid?: string;
    items: Array<{
      product_uuid: string;
      quantity: number;
      cost_price: number;
    }>;
  }): PurchaseWithRelations {
    const purchaseUuid = uuidv4();
    let total = 0;

    const transaction = db.transaction(() => {
      // Create purchase record
      db.prepare(`
        INSERT INTO purchases (purchase_uuid, total, supplier_uuid)
        VALUES (?, 0, ?)
      `).run(purchaseUuid, data.supplier_uuid || null);

      // Process each item
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_uuid, product_uuid, quantity, cost_price)
        VALUES (?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products 
        SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE product_uuid = ?
      `);

      const insertStockLedger = db.prepare(`
        INSERT INTO stock_ledgers (product_uuid, quantity, type, reference_uuid, note)
        VALUES (?, ?, 'purchase', ?, 'Stock added via purchase')
      `);

      for (const item of data.items) {
        // Check if product exists
        const product = db.prepare(
          'SELECT * FROM products WHERE product_uuid = ?'
        ).get(item.product_uuid) as any;

        if (!product) {
          throw new Error(`Product not found: ${item.product_uuid}`);
        }

        const quantity = Number(item.quantity);
        const costPrice = Number(item.cost_price);

        // Create purchase item
        insertItem.run(purchaseUuid, item.product_uuid, quantity, costPrice);

        // Update product stock
        updateStock.run(quantity, item.product_uuid);

        // Create stock ledger entry
        insertStockLedger.run(item.product_uuid, quantity, purchaseUuid);

        // Calculate total
        total += quantity * costPrice;
      }

      // Update purchase total
      db.prepare('UPDATE purchases SET total = ? WHERE purchase_uuid = ?')
        .run(Math.round(total * 100) / 100, purchaseUuid);

      return purchaseUuid;
    });

    transaction();

    // Return purchase with relations
    return this.findWithRelations(purchaseUuid)!;
  }

  // Find purchase by UUID
  static findById(uuid: string): Purchase | undefined {
    return db.prepare('SELECT * FROM purchases WHERE purchase_uuid = ?').get(uuid) as Purchase | undefined;
  }

  // Get purchase with items and supplier
  static findWithRelations(uuid: string): PurchaseWithRelations | undefined {
    const purchase = this.findById(uuid);
    if (!purchase) return undefined;

    // Get items with product details
    const items = db.prepare(`
      SELECT 
        pi.*,
        p.name as product_name,
        p.barcode as product_barcode,
        p.sku as product_sku
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_uuid = p.product_uuid
      WHERE pi.purchase_uuid = ?
    `).all(uuid) as (PurchaseItem & {
      product_name: string;
      product_barcode: string;
      product_sku: string;
    })[];

    // Get supplier if exists
    let supplier: any = null;
    if (purchase.supplier_uuid) {
      supplier = db.prepare(
        'SELECT * FROM suppliers WHERE supplier_uuid = ?'
      ).get(purchase.supplier_uuid) as any;
    }

    // Format items with product object
    const formattedItems = items.map(item => ({
      id: item.id,
      purchase_uuid: item.purchase_uuid,
      product_uuid: item.product_uuid,
      quantity: item.quantity,
      cost_price: item.cost_price,
      created_at: item.created_at,
      updated_at: item.updated_at,
      product: {
        product_uuid: item.product_uuid,
        name: item.product_name,
        barcode: item.product_barcode,
        sku: item.product_sku
      }
    }));

    return {
      ...purchase,
      items: formattedItems,
      supplier
    };
  }

  // List all purchases with relations
  static findAll(): PurchaseWithRelations[] {
    const purchases = db.prepare(
      'SELECT * FROM purchases ORDER BY created_at DESC'
    ).all() as Purchase[];

    return purchases.map(p => this.findWithRelations(p.purchase_uuid)!);
  }

  // Get purchases by supplier
  static findBySupplier(supplierUuid: string): PurchaseWithRelations[] {
    const purchases = db.prepare(
      'SELECT * FROM purchases WHERE supplier_uuid = ? ORDER BY created_at DESC'
    ).all(supplierUuid) as Purchase[];

    return purchases.map(p => this.findWithRelations(p.purchase_uuid)!);
  }

  // Get purchase items
  static getItems(purchaseUuid: string): PurchaseItem[] {
    return db.prepare(
      'SELECT * FROM purchase_items WHERE purchase_uuid = ?'
    ).all(purchaseUuid) as PurchaseItem[];
  }

  // Update purchase
  static update(uuid: string, data: {
    supplier_uuid?: string;
    total?: number;
  }): Purchase | undefined {
    const purchase = this.findById(uuid);
    if (!purchase) return undefined;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.supplier_uuid !== undefined) {
      updateFields.push('supplier_uuid = ?');
      values.push(data.supplier_uuid);
    }
    if (data.total !== undefined) {
      updateFields.push('total = ?');
      values.push(data.total);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(uuid);
      db.prepare(`UPDATE purchases SET ${updateFields.join(', ')} WHERE purchase_uuid = ?`).run(...values);
    }

    return this.findById(uuid);
  }

  // Delete purchase (reverse stock updates)
  static delete(uuid: string): boolean {
    const purchase = this.findById(uuid);
    if (!purchase) return false;

    const transaction = db.transaction(() => {
      // Get all items to reverse stock
      const items = this.getItems(uuid);

      // Reverse stock updates
      for (const item of items) {
        db.prepare(`
          UPDATE products 
          SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP 
          WHERE product_uuid = ?
        `).run(item.quantity, item.product_uuid);

        // Add stock ledger entry for reversal
        db.prepare(`
          INSERT INTO stock_ledgers (product_uuid, quantity, type, reference_uuid, note)
          VALUES (?, ?, 'adjustment', ?, 'Purchase deleted - stock reversed')
        `).run(item.product_uuid, -item.quantity, uuid);
      }

      // Delete purchase items
      db.prepare('DELETE FROM purchase_items WHERE purchase_uuid = ?').run(uuid);
      
      // Delete purchase
      const result = db.prepare('DELETE FROM purchases WHERE purchase_uuid = ?').run(uuid);
      return result.changes > 0;
    });

    return transaction();
  }
}
