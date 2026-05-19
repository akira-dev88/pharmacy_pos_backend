// models/Product.ts

import db from '../database/connection';
import {
  Product,
  ProductAttribute,
  ProductCreateInput,
  ProductUpdateInput
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ProductModel {

  // =========================
  // CREATE PRODUCT
  // =========================

  static create(input: ProductCreateInput): Product {
    const productUuid = uuidv4();

    const transaction = db.transaction(() => {

      // INSERT PRODUCT
      const productStmt = db.prepare(`
        INSERT INTO products (
          product_uuid,
          name,
          category_uuid,
          subcategory,
          barcode,
          sku,
          unit,
          price,
          purchase_price,
          gst_percent,
          stock,
          hsn_code,
          image
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      productStmt.run(
        productUuid,
        input.name,
        input.category_uuid || null,
        input.subcategory || null,
        input.barcode || null,
        input.sku || null,
        input.unit || 'piece',
        input.price,
        input.purchase_price || 0,
        input.gst_percent || 0,
        input.stock || 0,
        input.hsn_code || null,
        input.image || null
      );

      // INSERT ATTRIBUTES
      if (input.attributes?.length) {

        const attrStmt = db.prepare(`
          INSERT INTO product_attributes (
            product_uuid,
            attribute_uuid,
            value
          ) VALUES (?, ?, ?)
        `);

        for (const attr of input.attributes) {
          attrStmt.run(
            productUuid,
            attr.attribute_uuid,
            attr.value
          );
        }
      }
    });

    transaction();

    return this.findById(productUuid)!;
  }

  // =========================
  // FIND PRODUCT BY ID
  // =========================

  static findById(uuid: string): Product | undefined {

    const productStmt = db.prepare(`
      SELECT * FROM products
      WHERE product_uuid = ?
    `);

    const product = productStmt.get(uuid) as Product | undefined;

    if (!product) return undefined;

    product.attributes = this.getAttributes(uuid);

    return product;
  }

  // =========================
  // GET PRODUCT ATTRIBUTES
  // =========================

  static getAttributes(productUuid: string): ProductAttribute[] {

    const stmt = db.prepare(`
      SELECT
        pa.attribute_uuid,
        a.name,
        pa.value
      FROM product_attributes pa
      INNER JOIN attributes a
      ON a.attribute_uuid = pa.attribute_uuid
      WHERE pa.product_uuid = ?
    `);

    return stmt.all(productUuid) as ProductAttribute[];
  }

  // =========================
  // FIND BY BARCODE
  // =========================

  static findByBarcode(barcode: string): Product | undefined {

    const stmt = db.prepare(`
      SELECT * FROM products
      WHERE barcode = ?
    `);

    const product = stmt.get(barcode) as Product | undefined;

    if (!product) return undefined;

    product.attributes = this.getAttributes(product.product_uuid);

    return product;
  }

  // =========================
  // FIND BY SKU
  // =========================

  static findBySku(sku: string): Product | undefined {

    const stmt = db.prepare(`
      SELECT * FROM products
      WHERE sku = ?
    `);

    const product = stmt.get(sku) as Product | undefined;

    if (!product) return undefined;

    product.attributes = this.getAttributes(product.product_uuid);

    return product;
  }

  // =========================
  // LIST PRODUCTS
  // =========================

  static findAll(
    page: number = 1,
    limit: number = 20
  ): {
    products: Product[];
    total: number;
  } {

    const offset = (page - 1) * limit;

    const stmt = db.prepare(`
      SELECT * FROM products
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const products = stmt.all(limit, offset) as Product[];

    for (const product of products) {
      product.attributes = this.getAttributes(product.product_uuid);
    }

    const total = (
      db.prepare(`
        SELECT COUNT(*) as count
        FROM products
      `).get() as any
    ).count;

    return {
      products,
      total
    };
  }

  // =========================
  // SEARCH PRODUCTS
  // =========================

  static search(query: string, limit: number = 20): Product[] {

    const stmt = db.prepare(`
      SELECT DISTINCT p.*
      FROM products p
      LEFT JOIN product_attributes pa
      ON p.product_uuid = pa.product_uuid

      WHERE
        p.name LIKE ?
        OR p.sku LIKE ?
        OR p.barcode LIKE ?
        OR pa.value LIKE ?

      ORDER BY p.name ASC
      LIMIT ?
    `);

    const products = stmt.all(
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      `%${query}%`,
      limit
    ) as Product[];

    for (const product of products) {
      product.attributes = this.getAttributes(product.product_uuid);
    }

    return products;
  }

  // =========================
  // UPDATE PRODUCT
  // =========================

  static update(
    uuid: string,
    updates: ProductUpdateInput
  ): Product | undefined {

    const existing = this.findById(uuid);

    if (!existing) return undefined;

    const transaction = db.transaction(() => {

      const allowedFields = [
        'name',
        'category_uuid',
        'subcategory',
        'barcode',
        'sku',
        'unit',
        'price',
        'purchase_price',
        'gst_percent',
        'stock',
        'hsn_code',
        'image'
      ];

      const updateFields: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(updates)) {

        if (
          allowedFields.includes(key) &&
          value !== undefined
        ) {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updateFields.length) {

        updateFields.push(`
          updated_at = CURRENT_TIMESTAMP
        `);

        values.push(uuid);

        const stmt = db.prepare(`
          UPDATE products
          SET ${updateFields.join(', ')}
          WHERE product_uuid = ?
        `);

        stmt.run(...values);
      }

      // UPDATE ATTRIBUTES

      if (updates.attributes) {

        db.prepare(`
          DELETE FROM product_attributes
          WHERE product_uuid = ?
        `).run(uuid);

        const attrStmt = db.prepare(`
          INSERT INTO product_attributes (
            product_uuid,
            attribute_uuid,
            value
          ) VALUES (?, ?, ?)
        `);

        for (const attr of updates.attributes) {
          attrStmt.run(
            uuid,
            attr.attribute_uuid,
            attr.value
          );
        }
      }
    });

    transaction();

    return this.findById(uuid);
  }

  // =========================
  // UPDATE STOCK
  // =========================

  static updateStock(
    uuid: string,
    quantity: number,
    operation: 'add' | 'subtract' = 'add'
  ): Product | undefined {

    const product = this.findById(uuid);

    if (!product) return undefined;

    const newStock =
      operation === 'add'
        ? product.stock + quantity
        : product.stock - quantity;

    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    const stmt = db.prepare(`
      UPDATE products
      SET
        stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_uuid = ?
    `);

    stmt.run(newStock, uuid);

    return this.findById(uuid);
  }

  // =========================
  // DELETE PRODUCT
  // =========================

  static delete(uuid: string): boolean {

    const transaction = db.transaction(() => {

      db.prepare(`
        DELETE FROM product_attributes
        WHERE product_uuid = ?
      `).run(uuid);

      const result = db.prepare(`
        DELETE FROM products
        WHERE product_uuid = ?
      `).run(uuid);

      return result.changes > 0;
    });

    return transaction();
  }

  // =========================
  // LOW STOCK
  // =========================

  static getLowStock(
    threshold: number = 10
  ): Product[] {

    const stmt = db.prepare(`
      SELECT * FROM products
      WHERE stock <= ?
      ORDER BY stock ASC
    `);

    const products = stmt.all(threshold) as Product[];

    for (const product of products) {
      product.attributes = this.getAttributes(product.product_uuid);
    }

    return products;
  }

  // =========================
  // COUNT
  // =========================

  static count(): number {

    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM products
    `).get() as any;

    return result.count;
  }
}