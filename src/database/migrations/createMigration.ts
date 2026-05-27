import fs from 'fs';
import path from 'path';

const name = process.argv[2];

if (!name) {
  console.log('Please provide migration name');
  process.exit(1);
}

const migrationsPath = path.join(__dirname);

const existing = fs
  .readdirSync(migrationsPath)
  .filter((f) => /^\d+_/.test(f))
  .sort();

const nextNumber =
  existing.length > 0
    ? parseInt(existing[existing.length - 1].split('_')[0]) + 1
    : 1;

const padded = String(nextNumber).padStart(3, '0');

const fileName = `${padded}_${name}.ts`;

const template = `
import db from '../connection';

export function up() {
  db.exec(\`
    
  \`);

  console.log('${fileName} executed');
}
`;

fs.writeFileSync(
  path.join(migrationsPath, fileName),
  template.trim()
);

console.log("done");