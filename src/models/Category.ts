// models/Category.ts

import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Category {
  category_uuid: string;
  name: string;
  parent_uuid?: string;
  created_at: string;
}

export interface CategoryCreateInput {
  name: string;
  parent_uuid?: string;
}

export class CategoryModel {

  // CREATE
  static create(
    input: CategoryCreateInput
  ): Category {

    const uuid = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO categories (
        category_uuid,
        name,
        parent_uuid
      ) VALUES (?, ?, ?)
    `);

    stmt.run(
      uuid,
      input.name,
      input.parent_uuid || null
    );

    return this.findById(uuid)!;
  }

  // FIND BY ID
  static findById(
    uuid: string
  ): Category | undefined {

    const stmt = db.prepare(`
      SELECT *
      FROM categories
      WHERE category_uuid = ?
    `);

    return stmt.get(uuid) as Category | undefined;
  }

  // FIND ALL
  static findAll(): Category[] {

    const stmt = db.prepare(`
      SELECT *
      FROM categories
      ORDER BY name ASC
    `);

    return stmt.all() as Category[];
  }

  // DELETE
  static delete(uuid: string): boolean {

    const stmt = db.prepare(`
      DELETE FROM categories
      WHERE category_uuid = ?
    `);

    const result = stmt.run(uuid);

    return result.changes > 0;
  }
}