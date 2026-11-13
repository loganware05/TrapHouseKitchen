#!/usr/bin/env node
/**
 * List lines containing "migrate deploy" in root-level docker/render config files.
 * Safer than ad-hoc grep from the wrong directory or unquoted patterns.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const files = [
  'docker-compose.yml',
  'docker-compose.dev.yml',
  'render.yaml',
  'render.staging.yaml',
];

let matched = false;
let anyFile = false;

for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  anyFile = true;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('migrate deploy')) {
      matched = true;
      console.log(`${f}:${i + 1}:${line}`);
    }
  });
}

if (!anyFile) {
  console.error('No docker-compose.yml, docker-compose.dev.yml, or render.yaml at repository root.');
  process.exit(2);
}

if (!matched) {
  console.error('No lines containing "migrate deploy" in those files.');
  process.exit(1);
}
