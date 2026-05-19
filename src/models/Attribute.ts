// models/Attribute.ts

import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Attribute {
  attribute_uuid: string;
  name: string;
  display_name: string;
  data_type: string;
  created_at: string;
}

export interface AttributeCreateInput {
  name: string;
  display_name: string;
  data_type: string;
}

export class AttributeModel {

  // CREATE
  static create(
    input: AttributeCreateInput
  ): Attribute {

    const uuid = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO attributes (
        attribute_uuid,
        name,
        display_name,
        data_type
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      uuid,
      input.name,
      input.display_name,
      input.data_type
    );

    return this.findById(uuid)!;
  }

  // FIND BY ID
  static findById(
    uuid: string
  ): Attribute | undefined {

    const stmt = db.prepare(`
      SELECT *
      FROM attributes
      WHERE attribute_uuid = ?
    `);

    return stmt.get(uuid) as Attribute | undefined;
  }

  // FIND ALL
  static findAll(): Attribute[] {

    const stmt = db.prepare(`
      SELECT *
      FROM attributes
      ORDER BY display_name ASC
    `);

    return stmt.all() as Attribute[];
  }

  // DELETE
  static delete(uuid: string): boolean {

    const stmt = db.prepare(`
      DELETE FROM attributes
      WHERE attribute_uuid = ?
    `);

    const result = stmt.run(uuid);

    return result.changes > 0;
  }
}