import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../src/cache.mjs';

test('stores and retrieves a value', () => {
  const c = createCache();
  c.set('k', { v: 1 });
  assert.deepEqual(c.get('k'), { v: 1 });
});

test('returns undefined for a missing key', () => {
  const c = createCache();
  assert.equal(c.get('missing'), undefined);
});

test('expires entries after ttl', () => {
  let t = 1000;
  const c = createCache({ ttlMs: 100, now: () => t });
  c.set('k', 'v');
  t = 1099;
  assert.equal(c.get('k'), 'v');
  t = 1101;
  assert.equal(c.get('k'), undefined);
});

test('evicts least-recently-used when at capacity', () => {
  const c = createCache({ max: 2 });
  c.set('a', 1);
  c.set('b', 2);
  c.get('a'); // 'a' becomes most-recent → 'b' is now LRU
  c.set('c', 3); // evicts 'b'
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('c'), 3);
});
