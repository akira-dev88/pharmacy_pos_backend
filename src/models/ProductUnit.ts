// models/ProductUnit.ts

import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

import type {
  ProductUnit,
  ProductUnitCreateInput
} from '../types';

export class ProductUnitModel {

  // CREATE

  static create(
    input: ProductUnitCreateInput
  ): ProductUnit {

    const uuid = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO product_units (

        unit_uuid,

        product_uuid,

        unit_name,
        conversion_factor,

        barcode,

        price,
        purchase_price,

        is_base_unit

      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(

      uuid,

      input.product_uuid,

      input.unit_name,
      input.conversion_factor,

      input.barcode || null,

      input.price || null,
      input.purchase_price || null,

      input.is_base_unit || 0
    );

    return this.findById(uuid)!;
  }

  // FIND BY ID

  static findById(
    uuid: string
  ): ProductUnit | undefined {

    const stmt = db.prepare(`
      SELECT *
      FROM product_units
      WHERE unit_uuid = ?
    `);

    return stmt.get(uuid) as ProductUnit;
  }

  // GET PRODUCT UNITS

  static getByProduct(
    product_uuid: string
  ): ProductUnit[] {

    const stmt = db.prepare(`
      SELECT *
      FROM product_units
      WHERE product_uuid = ?
      ORDER BY conversion_factor ASC
    `);

    return stmt.all(product_uuid) as ProductUnit[];
  }

  // DELETE

  static delete(
    uuid: string
  ): boolean {

    const stmt = db.prepare(`
      DELETE FROM product_units
      WHERE unit_uuid = ?
    `);

    const result = stmt.run(uuid);

    return result.changes > 0;
  }
}