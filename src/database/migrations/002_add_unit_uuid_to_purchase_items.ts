import db from '../connection';

export function up() {
  db.exec(`
    ALTER TABLE purchase_items
    ADD COLUMN unit_uuid TEXT;
  `);

  console.log('Added unit_uuid column to purchase_items');
}