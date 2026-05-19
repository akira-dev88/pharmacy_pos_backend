import db from '../database/connection';
import type { Supplier } from '../types/index';
import { v4 as uuidv4 } from 'uuid';

export class SupplierModel {
  // Create new supplier
  static create(data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }): Supplier {
    const uuid = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO suppliers (supplier_uuid, name, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuid,
      data.name,
      data.phone || null,
      data.email || null,
      data.address || null
    );

    return this.findById(uuid)!;
  }

  // Find supplier by UUID
  static findById(uuid: string): Supplier | undefined {
    return db.prepare('SELECT * FROM suppliers WHERE supplier_uuid = ?').get(uuid) as Supplier | undefined;
  }

  // List all suppliers (latest first - matching PHP)
  static findAll(): Supplier[] {
    return db.prepare('SELECT * FROM suppliers ORDER BY created_at DESC').all() as Supplier[];
  }

  // Search suppliers
  static search(query: string): Supplier[] {
    return db.prepare(`
      SELECT * FROM suppliers 
      WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as Supplier[];
  }

  // Update supplier
  static update(uuid: string, data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }): Supplier | undefined {
    const supplier = this.findById(uuid);
    if (!supplier) return undefined;

    const updateFields: string[] = [];
    const values: any[] = [];

    // Only update fields that are explicitly provided
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updateFields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updateFields.push('email = ?');
      values.push(data.email);
    }
    if (data.address !== undefined) {
      updateFields.push('address = ?');
      values.push(data.address);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(uuid);

      db.prepare(`UPDATE suppliers SET ${updateFields.join(', ')} WHERE supplier_uuid = ?`).run(...values);
    }

    return this.findById(uuid);
  }

  // Delete supplier
  static delete(uuid: string): boolean {
    const result = db.prepare('DELETE FROM suppliers WHERE supplier_uuid = ?').run(uuid);
    return result.changes > 0;
  }

  // Get supplier with purchase count
  static getWithPurchaseCount(uuid: string): (Supplier & { purchase_count: number }) | undefined {
    const supplier = db.prepare(`
      SELECT s.*, COUNT(p.purchase_uuid) as purchase_count
      FROM suppliers s
      LEFT JOIN purchases p ON s.supplier_uuid = p.supplier_uuid
      WHERE s.supplier_uuid = ?
      GROUP BY s.supplier_uuid
    `).get(uuid) as (Supplier & { purchase_count: number }) | undefined;

    return supplier;
  }

  // Get all suppliers with purchase counts
  static findAllWithPurchaseCounts(): (Supplier & { purchase_count: number })[] {
    return db.prepare(`
      SELECT s.*, COUNT(p.purchase_uuid) as purchase_count
      FROM suppliers s
      LEFT JOIN purchases p ON s.supplier_uuid = p.supplier_uuid
      GROUP BY s.supplier_uuid
      ORDER BY s.created_at DESC
    `).all() as (Supplier & { purchase_count: number })[];
  }
}
