/**
 * Lightweight selftest for VAPID key decoding used by PushManager.subscribe.
 * Run: npx tsx frontend/src/lib/webPush.selftest.ts
 */
import { urlBase64ToUint8Array } from './webPushCrypto';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sample =
  'BLImMsYGOfgmCSjeHnFriLRpZ5ClGH_voKQ8gWL279l6lUFxVh89eFXWpU0wB7k648T923egflr5YddbKSs_M6A';
const bytes = urlBase64ToUint8Array(sample);
assert(bytes instanceof Uint8Array, 'expected Uint8Array');
assert(bytes.length === 65, `expected 65-byte uncompressed key, got ${bytes.length}`);
assert(bytes[0] === 0x04, 'expected uncompressed EC point prefix 0x04');

console.log('webPush.selftest: ok');
