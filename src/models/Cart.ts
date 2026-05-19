import db from '../database/connection';
import type { Cart, CartItem, CartWithItems, CartSummary} from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class CartModel {
  // Create new cart
  static create(): Cart {
    const uuid = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO carts (cart_uuid, status, discount)
      VALUES (?, 'active', 0.00)
    `);

    stmt.run(uuid);
    return this.findById(uuid)!;
  }
  
  // Find cart by UUID
  static findById(uuid: string): Cart | undefined {
    const stmt = db.prepare('SELECT * FROM carts WHERE cart_uuid = ?');
    return stmt.get(uuid) as Cart | undefined;
  }

  // Get cart with items and product details
  static findWithItems(uuid: string): CartWithItems | undefined {
    const cart = this.findById(uuid);
    if (!cart) return undefined;

    // Get items with product details
    const items = db.prepare(`
      SELECT 
        ci.*,
        p.name as product_name,
        p.barcode as product_barcode,
        p.sku as product_sku,
        p.gst_percent as product_gst_percent,
        p.stock as product_stock
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_uuid = p.product_uuid
      WHERE ci.cart_uuid = ?
    `).all(uuid) as (CartItem & {
      product_name: string;
      product_barcode: string;
      product_sku: string;
      product_gst_percent: number;
      product_stock: number;
    })[];

    // Calculate summary
    const summary = this.calculateSummary(items, cart.discount);

    // Format items with product object
    const formattedItems = items.map(item => ({
      id: item.id,
      cart_uuid: item.cart_uuid,
      product_uuid: item.product_uuid,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount,
      tax_percent: item.tax_percent,
      created_at: item.created_at,
      updated_at: item.updated_at,
      product: {
        product_uuid: item.product_uuid,
        name: item.product_name,
        barcode: item.product_barcode,
        sku: item.product_sku,
        price: item.price,
        gst_percent: item.product_gst_percent,
        stock: item.product_stock,
        created_at: '',
        updated_at: ''
      }
    }));

    return {
      ...cart,
      items: formattedItems,
      summary
    };
  }

  // Calculate cart summary
  static calculateSummary(items: CartItem[], billDiscount: number = 0): CartSummary {
    let total = 0;
    let itemDiscountTotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const itemBase = item.price * item.quantity;
      const itemDiscount = item.discount || 0;
      const itemNet = itemBase - itemDiscount;
      const taxAmount = (itemNet * item.tax_percent) / 100;

      total += itemBase;
      itemDiscountTotal += itemDiscount;
      taxTotal += taxAmount;
    }

    const grandTotal = total - itemDiscountTotal - billDiscount + taxTotal;

    return {
      total: Math.round(total * 100) / 100,
      item_discount: Math.round(itemDiscountTotal * 100) / 100,
      bill_discount: Math.round(billDiscount * 100) / 100,
      tax: Math.round(taxTotal * 100) / 100,
      grand_total: Math.round(grandTotal * 100) / 100
    };
  }

  // Add item to cart
  static addItem(cartUuid: string, productUuid: string, quantity: number, price: number, taxPercent: number): CartItem {
    // Check if item already exists in cart
    const existingItem = db.prepare(`
      SELECT * FROM cart_items 
      WHERE cart_uuid = ? AND product_uuid = ?
    `).get(cartUuid, productUuid) as CartItem | undefined;

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      db.prepare(`
        UPDATE cart_items 
        SET quantity = ?, 
            price = ?, 
            tax_percent = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, price, taxPercent, existingItem.id);

      return db.prepare('SELECT * FROM cart_items WHERE id = ?').get(existingItem.id) as CartItem;
    } else {
      // Insert new item
      const stmt = db.prepare(`
        INSERT INTO cart_items (cart_uuid, product_uuid, quantity, price, tax_percent, discount)
        VALUES (?, ?, ?, ?, ?, 0.00)
      `);

      const result = stmt.run(cartUuid, productUuid, quantity, price, taxPercent);
      
      return db.prepare('SELECT * FROM cart_items WHERE id = ?').get(result.lastInsertRowid) as CartItem;
    }
  }

  // Update cart item
  static updateItem(cartUuid: string, productUuid: string, updates: {
    quantity?: number;
    price?: number;
    discount?: number;
    tax_percent?: number;
  }): CartItem | undefined {
    const item = db.prepare(`
      SELECT * FROM cart_items 
      WHERE cart_uuid = ? AND product_uuid = ?
    `).get(cartUuid, productUuid) as CartItem | undefined;

    if (!item) return undefined;

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.quantity !== undefined) {
      updateFields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.price !== undefined) {
      updateFields.push('price = ?');
      values.push(updates.price);
    }
    if (updates.discount !== undefined) {
      updateFields.push('discount = ?');
      values.push(updates.discount);
    }
    if (updates.tax_percent !== undefined) {
      updateFields.push('tax_percent = ?');
      values.push(updates.tax_percent);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(cartUuid, productUuid);

      db.prepare(`
        UPDATE cart_items 
        SET ${updateFields.join(', ')} 
        WHERE cart_uuid = ? AND product_uuid = ?
      `).run(...values);
    }

    return db.prepare(`
      SELECT * FROM cart_items WHERE cart_uuid = ? AND product_uuid = ?
    `).get(cartUuid, productUuid) as CartItem;
  }

  // Remove item from cart
  static removeItem(cartUuid: string, productUuid: string): boolean {
    const result = db.prepare(`
      DELETE FROM cart_items 
      WHERE cart_uuid = ? AND product_uuid = ?
    `).run(cartUuid, productUuid);

    return result.changes > 0;
  }

  // Apply bill discount
  static applyDiscount(cartUuid: string, discount: number): Cart | undefined {
    db.prepare(`
      UPDATE carts 
      SET discount = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE cart_uuid = ?
    `).run(discount, cartUuid);

    return this.findById(cartUuid);
  }

  // Update cart status
  static updateStatus(cartUuid: string, status: Cart['status']): Cart | undefined {
    db.prepare(`
      UPDATE carts 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE cart_uuid = ?
    `).run(status, cartUuid);

    return this.findById(cartUuid);
  }

  // Hold cart
  static hold(cartUuid: string): Cart | undefined {
    return this.updateStatus(cartUuid, 'held');
  }

  // Resume cart
  static resume(cartUuid: string): Cart | undefined {
    return this.updateStatus(cartUuid, 'active');
  }

  // Get all held carts
  static getHeldCarts(): Cart[] {
    const stmt = db.prepare(`
      SELECT * FROM carts 
      WHERE status = 'held' 
      ORDER BY updated_at DESC
    `);
    return stmt.all() as Cart[];
  }

  // Get all active carts
  static getActiveCarts(): Cart[] {
    const stmt = db.prepare(`
      SELECT * FROM carts 
      WHERE status = 'active' 
      ORDER BY created_at DESC
    `);
    return stmt.all() as Cart[];
  }

  // Clear all items from cart
  static clearCart(cartUuid: string): void {
    db.prepare('DELETE FROM cart_items WHERE cart_uuid = ?').run(cartUuid);
    db.prepare(`
      UPDATE carts 
      SET discount = 0.00, updated_at = CURRENT_TIMESTAMP 
      WHERE cart_uuid = ?
    `).run(cartUuid);
  }

  // Delete cart and all its items
  static delete(cartUuid: string): boolean {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM cart_items WHERE cart_uuid = ?').run(cartUuid);
      const result = db.prepare('DELETE FROM carts WHERE cart_uuid = ?').run(cartUuid);
      return result.changes > 0;
    });

    return transaction();
  }
}
