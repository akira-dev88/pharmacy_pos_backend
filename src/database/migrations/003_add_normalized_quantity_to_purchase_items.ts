import db from '../connection';

export function up() {
  db.exec(`
    ALTER TABLE purchase_items
    ADD COLUMN normalized_quantity REAL DEFAULT 0;
  `);

  console.log(
    'Added normalized_quantity column to purchase_items'
  );
}