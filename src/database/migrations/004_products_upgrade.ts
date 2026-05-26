import db from '../connection';

export function upgradeProductsTable(): void {

  const cols =
    db.prepare(`PRAGMA table_info(products)`).all() as any[];

  const hasCategoryUuid =
    cols.some(c => c.name === 'category_uuid');

  if (!hasCategoryUuid) {
    db.exec(`
      ALTER TABLE products
      ADD COLUMN category_uuid TEXT
    `);

    console.log('Added category_uuid column');
  }

  const hasSubcategory =
    cols.some(c => c.name === 'subcategory');

  if (!hasSubcategory) {
    db.exec(`
      ALTER TABLE products
      ADD COLUMN subcategory TEXT
    `);

    console.log('Added subcategory column');
  }

  const hasImage =
    cols.some(c => c.name === 'image');

  if (!hasImage) {
    db.exec(`
      ALTER TABLE products
      ADD COLUMN image TEXT
    `);

    console.log('Added image column');
  }

  const hasIsDeleted =
    cols.some(c => c.name === 'is_deleted');

  if (!hasIsDeleted) {
    db.exec(`
      ALTER TABLE products
      ADD COLUMN is_deleted INTEGER DEFAULT 0
    `);

    console.log('Added is_deleted column');
  }
}