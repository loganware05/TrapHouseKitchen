/**
 * Selftest: session token must be written to localStorage before auth state
 * updates, otherwise axios still sends the previous JWT into the new user's
 * React Query keys (cross-account coupon/order leak).
 *
 * Run: npx tsx src/lib/authSessionToken.selftest.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const authStore = readFileSync(join(root, '../stores/authStore.ts'), 'utf8');

for (const method of ['login', 'register', 'guestLogin'] as const) {
  const block = authStore.slice(authStore.indexOf(`${method}:`));
  const setIdx = block.indexOf('set({ user, token');
  const lsIdx = block.indexOf("localStorage.setItem('token', token)");
  assert.ok(lsIdx >= 0, `${method}: missing localStorage.setItem`);
  assert.ok(setIdx >= 0, `${method}: missing set({ user, token })`);
  assert.ok(
    lsIdx < setIdx,
    `${method}: localStorage.setItem must run before set({ user, token })`
  );
}

console.log('authSessionToken.selftest: ok');
