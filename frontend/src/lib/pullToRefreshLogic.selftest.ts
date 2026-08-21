import assert from 'node:assert/strict';
import {
  isVerticalDominantPull,
  nextPullStatus,
  resistedPullDistance,
  shouldStartPull,
} from './pullToRefreshLogic.ts';

assert.equal(shouldStartPull(0, true, false), true);
assert.equal(shouldStartPull(10, true, false), false);
assert.equal(shouldStartPull(0, false, false), false);
assert.equal(shouldStartPull(0, true, true), false);

assert.equal(isVerticalDominantPull(5, 20), true);
assert.equal(isVerticalDominantPull(30, 10), false);
assert.equal(isVerticalDominantPull(0, -10), false);

assert.equal(resistedPullDistance(100), 45);
assert.equal(resistedPullDistance(0), 0);
assert.equal(resistedPullDistance(-20), 0);

assert.equal(nextPullStatus(0, 72, false), 'idle');
assert.equal(nextPullStatus(40, 72, false), 'pulling');
assert.equal(nextPullStatus(72, 72, false), 'ready');
assert.equal(nextPullStatus(10, 72, true), 'refreshing');

console.log('pullToRefreshLogic: all assertions passed');
