import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRedisCache } from '../src/redis-cache.mjs';

function fakeRedis() {
  const store = new Map();
  return {
    store,
    async get(k) {
      const e = store.get(k);
      return e === undefined ? null : e.value;
    },
    async set(k, v, opts) {
      store.set(k, { value: v, ex: opts?.ex });
    },
  };
}

test('createRedisCache requires a client', () => {
  assert.throws(() => createRedisCache({}), /redis client/);
});

test('returns undefined for a missing key', async () => {
  const cache = createRedisCache({ client: fakeRedis() });
  assert.equal(await cache.get('missing'), undefined);
});

test('round-trips a value', async () => {
  const cache = createRedisCache({ client: fakeRedis() });
  await cache.set('k', { v: 42 });
  assert.deepEqual(await cache.get('k'), { v: 42 });
});

test('writes with seconds-precision TTL derived from ttlMs', async () => {
  const client = fakeRedis();
  const cache = createRedisCache({ client, ttlMs: 90_000 });
  await cache.set('k', 'v');
  assert.equal(client.store.get('k').ex, 90);
});
