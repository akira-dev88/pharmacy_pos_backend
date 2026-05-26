import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const APP_TYPE =
  process.env.APP_TYPE || 'billing';

const APP_DB_NAME =
  process.env.APP_DB_NAME ||
  (APP_TYPE === 'hardware'
    ? 'pos_hardware.db'
    : APP_TYPE === 'pharmacy'
    ? 'pos_pharmacy.db'
    : 'pos_billing.db');

const getDbPath = (): string => {

  // Explicit override
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // =========================
  // PRODUCTION
  // =========================

  if (process.env.NODE_ENV === 'production') {

    const userDataPath =
      process.env.USER_DATA_PATH ||
      process.env.RESOURCES_PATH ||
      process.cwd();

    return path.join(
      userDataPath,
      'database',
      APP_DB_NAME
    );
  }

  // =========================
  // DEVELOPMENT
  // =========================

  return path.join(
    process.cwd(),
    'server',
    'database',
    APP_DB_NAME
  );
};

const dbPath = getDbPath();

const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });

  console.log(`📁 Created database directory: ${dbDir}`);
}

console.log(`🗄️ Database path: ${path.resolve(dbPath)}`);
console.log(`🏷️ APP_TYPE: ${APP_TYPE}`);
console.log(`🗃️ APP_DB_NAME: ${APP_DB_NAME}`);

const options: Database.Options = {};

if (process.env.NODE_ENV === 'development') {
  options.verbose = console.log;
}

const db = new Database(
  path.resolve(dbPath),
  options
);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;