import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/rate-limit.mjs';

test('allows up to capacity then denies', () => {
  const rl = createRateLimiter({ capacity: 3, refillPerSec: 0, now: () => 0 });
  assert.equal(rl.allow('ip'), true);
  assert.equal(rl.allow('ip'), true);
  assert.equal(rl.allow('ip'), true);
  assert.equal(rl.allow('ip'), false);
});

test('refills over time', () => {
  let t = 0;
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 1, now: () => t });
  assert.equal(rl.allow('ip'), true);
  assert.equal(rl.allow('ip'), false);
  t = 1000; // +1s → +1 token
  assert.equal(rl.allow('ip'), true);
});

test('tracks buckets per key', () => {
  const rl = createRateLimiter({ capacity: 1, refillPerSec: 0, now: () => 0 });
  assert.equal(rl.allow('a'), true);
  assert.equal(rl.allow('b'), true); // separate bucket
  assert.equal(rl.allow('a'), false);
});
