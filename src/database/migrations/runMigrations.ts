import fs from 'fs';
import path from 'path';
import db from '../connection';

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

function runMigrations() {
  console.log('Running migrations...');

  db.exec(MIGRATIONS_TABLE);

  const migrationsPath = path.join(__dirname);

  const files = fs
    .readdirSync(migrationsPath)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        file !== 'runMigrations.ts' &&
        file !== 'createMigration.ts'
    )
    .sort();

  for (const file of files) {
    const migrationName = file;

    const alreadyRun = db
      .prepare('SELECT * FROM migrations WHERE name = ?')
      .get(migrationName);

    if (alreadyRun) {
      console.log(`Skipping ${migrationName}`);
      continue;
    }

    console.log(`Running ${migrationName}`);

    const migration = require(path.join(migrationsPath, file));

    if (migration.up && typeof migration.up === 'function') {
      migration.up();

      db.prepare(
        'INSERT INTO migrations (name) VALUES (?)'
      ).run(migrationName);

      console.log(`Completed ${migrationName}`);
    }
  }

  console.log('All migrations completed!');
}

runMigrations();