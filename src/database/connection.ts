import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const getDbPath = (): string => {
  // 1. Explicit override (useful for testing)
  if (process.env.DB_PATH) return process.env.DB_PATH;

  if (process.env.NODE_ENV === 'production') {
    // USER_DATA_PATH = ~/.config/POS Billing System/ on Linux (always writable)
    // Falls back to RESOURCES_PATH or cwd if not set
    const userDataPath =
      process.env.USER_DATA_PATH ||
      process.env.RESOURCES_PATH ||
      process.cwd();
    return path.join(userDataPath, 'database', 'pos_billing.db');
  }

  // Development: relative to project root
  return path.join(process.cwd(), 'server/database/pos_billing.db');
};

const dbPath = getDbPath();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created database directory: ${dbDir}`);
}

console.log(`🗄️  Database path: ${path.resolve(dbPath)}`);

const options: Database.Options = {};
if (process.env.NODE_ENV === 'development') {
  options.verbose = console.log;
}

const db = new Database(path.resolve(dbPath), options);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
