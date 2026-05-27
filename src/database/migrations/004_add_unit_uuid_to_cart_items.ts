import db from '../connection';

export function up() {
  db.exec(`
    ALTER TABLE cart_items
    ADD COLUMN unit_uuid TEXT;
  `);

  console.log('Added unit_uuid column to cart_items');
}