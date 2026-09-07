/**
 * Selftest: logout must clear localStorage token before awaiting push revoke,
 * and pass the prior token into revoke so unsubscribe still authenticates.
 *
 * Run: npx tsx src/lib/authLogoutPush.selftest.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const authStore = readFileSync(join(root, '../stores/authStore.ts'), 'utf8');
const webPush = readFileSync(join(root, './webPush.ts'), 'utf8');

const logoutBlock = authStore.slice(authStore.indexOf('logout:'));
const removeIdx = logoutBlock.indexOf("localStorage.removeItem('token')");
const revokeIdx = logoutBlock.indexOf('revokePushOnLogout(previousToken)');
assert.ok(removeIdx >= 0, 'logout: missing localStorage.removeItem');
assert.ok(revokeIdx >= 0, 'logout: must call revokePushOnLogout(previousToken)');
assert.ok(
  removeIdx < revokeIdx,
  'logout: clear token before revokePushOnLogout so JWT is not held for a hung network call'
);

assert.match(
  webPush,
  /authToken\?:/,
  'unsubscribeFromWebPush must accept authToken for post-clear revoke'
);
assert.match(
  webPush,
  /LOGOUT_REVOKE_TIMEOUT_MS/,
  'revokePushOnLogout must time-bound the revoke'
);

console.log('authLogoutPush.selftest: ok');
