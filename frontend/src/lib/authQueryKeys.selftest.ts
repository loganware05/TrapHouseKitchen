/**
 * Selftest: auth-scoped query keys include userId so caches cannot collide across accounts.
 * Run: npx tsx src/lib/authQueryKeys.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  eligibleOrdersQueryKey,
  myCouponsQueryKey,
  myReviewsQueryKey,
  spendTrackerQueryKey,
  userProfileQueryKey,
  userSpendQueryKey,
} from './authQueryKeys';

const a = 'user-a';
const b = 'user-b';

assert.notDeepEqual(myCouponsQueryKey(a), myCouponsQueryKey(b));
assert.notDeepEqual(myReviewsQueryKey(a), myReviewsQueryKey(b));
assert.notDeepEqual(userProfileQueryKey(a), userProfileQueryKey(b));
assert.notDeepEqual(userSpendQueryKey(a, '7d'), userSpendQueryKey(b, '7d'));
assert.notDeepEqual(eligibleOrdersQueryKey(a), eligibleOrdersQueryKey(b));
assert.notDeepEqual(spendTrackerQueryKey(a), spendTrackerQueryKey(b));

assert.deepEqual(myCouponsQueryKey(a), ['myCoupons', a]);
assert.deepEqual(spendTrackerQueryKey(a), ['orders', a, 'spend-tracker']);
assert.deepEqual(['orders', a], ['orders', a]);
assert.notDeepEqual(['orders', a], ['orders', b]);

console.log('authQueryKeys.selftest: ok');
