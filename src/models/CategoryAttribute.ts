// models/CategoryAttribute.ts

import db from '../database/connection';

export class CategoryAttributeModel {

  // ASSIGN ATTRIBUTE TO CATEGORY

  static assign(
    category_uuid: string,
    attribute_uuid: string,
    is_required: boolean = false,
    sort_order: number = 0
  ) {

    const stmt = db.prepare(`
      INSERT INTO category_attributes (
        category_uuid,
        attribute_uuid,
        is_required,
        sort_order
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      category_uuid,
      attribute_uuid,
      is_required ? 1 : 0,
      sort_order
    );

    return true;
  }

  // GET ATTRIBUTES FOR CATEGORY

  static getByCategory(
    category_uuid: string
  ) {

    const stmt = db.prepare(`
      SELECT
        a.attribute_uuid,
        a.name,
        a.display_name,
        a.data_type,

        ca.is_required,
        ca.sort_order

      FROM category_attributes ca

      INNER JOIN attributes a
      ON a.attribute_uuid = ca.attribute_uuid

      WHERE ca.category_uuid = ?

      ORDER BY ca.sort_order ASC
    `);

    return stmt.all(category_uuid);
  }

  // REMOVE ATTRIBUTE

  static remove(
    category_uuid: string,
    attribute_uuid: string
  ) {

    const stmt = db.prepare(`
      DELETE FROM category_attributes
      WHERE category_uuid = ?
      AND attribute_uuid = ?
    `);

    return stmt.run(
      category_uuid,
      attribute_uuid
    );
  }
}