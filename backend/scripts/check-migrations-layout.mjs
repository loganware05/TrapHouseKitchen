#!/usr/bin/env node
/**
 * Fail if loose *.sql files sit directly under prisma/migrations/.
 * Only timestamped folders + migration_lock.toml belong there.
 *
 * --fix  Remove known legacy filenames only (see LEGACY_LOOSE_SQL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../prisma/migrations');
const fix = process.argv.includes('--fix');

/** Loose SQL files we once committed by mistake; safe to delete (copy kept under scripts/). */
const LEGACY_LOOSE_SQL = new Set(['add_order_fields.sql']);

function collectLooseSql() {
  const bad = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'migration_lock.toml') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile() && name.endsWith('.sql')) {
      bad.push({ name, full, rel: path.relative(path.join(__dirname, '..'), full) });
    }
  }
  return bad;
}

if (!fs.existsSync(dir)) {
  console.error(`Missing ${dir}`);
  process.exit(1);
}

if (fix) {
  for (const name of LEGACY_LOOSE_SQL) {
    const full = path.join(dir, name);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      fs.unlinkSync(full);
      console.log(
        `Removed legacy ${name} from prisma/migrations/ (see scripts/legacy-add-order-fields.sql).`
      );
    }
  }
}

const bad = collectLooseSql();

if (bad.length) {
  console.error(
    'Remove loose SQL from prisma/migrations/ (Prisma only applies subfolders).\n' +
      'Reference copy: backend/scripts/legacy-add-order-fields.sql\n' +
      'Or run: npm run prisma:fix-migrations-dir\n' +
      bad.map((x) => `  - ${x.rel}`).join('\n')
  );
  process.exit(1);
}
