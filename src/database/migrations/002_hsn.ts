import db from '../connection';

export function addHsnCode(): void {
  // Add hsn_code column if it doesn't exist
  const cols = db.prepare("PRAGMA table_info(products)").all() as any[];
  const hasHsn = cols.some(c => c.name === 'hsn_code');
  if (!hasHsn) {
    db.exec(`ALTER TABLE products ADD COLUMN hsn_code TEXT`);
    console.log('Added hsn_code column to products');
  }
}