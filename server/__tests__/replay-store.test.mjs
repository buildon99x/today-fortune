import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryReplayStore, createRedisReplayStore } from '../src/replay-store.mjs';

test('in-memory: has returns false before remember', async () => {
  const s = createInMemoryReplayStore();
  assert.equal(await s.has('x'), false);
});

test('in-memory: remember then has returns true', async () => {
  const s = createInMemoryReplayStore();
  await s.remember('x');
  assert.equal(await s.has('x'), true);
});

test('in-memory: expires after ttl', async () => {
  let t = 1000;
  const s = createInMemoryReplayStore({ ttlMs: 100, now: () => t });
  await s.remember('x');
  t = 1099;
  assert.equal(await s.has('x'), true);
  t = 1101;
  assert.equal(await s.has('x'), false);
});

test('in-memory: evicts oldest at capacity', async () => {
  const s = createInMemoryReplayStore({ max: 2 });
  await s.remember('a');
  await s.remember('b');
  await s.remember('c'); // evicts 'a'
  assert.equal(await s.has('a'), false);
  assert.equal(await s.has('b'), true);
  assert.equal(await s.has('c'), true);
});

// Redis-backed variant with a fake client

function fakeRedis() {
  const store = new Map();
  return {
    async get(k) {
      const e = store.get(k);
      return e === undefined ? null : e.v;
    },
    async set(k, v, opts) {
      store.set(k, { v, ex: opts?.ex });
    },
    _store: store,
  };
}

test('redis: requires client', () => {
  assert.throws(() => createRedisReplayStore({}), /redis client/);
});

test('redis: round-trips, uses replay: prefix with TTL, and hashes the id (no plaintext)', async () => {
  const client = fakeRedis();
  const s = createRedisReplayStore({ client, ttlMs: 60_000 });
  assert.equal(await s.has('tx-1'), false);
  await s.remember('tx-1');
  assert.equal(await s.has('tx-1'), true);

  const keys = [...client._store.keys()];
  assert.equal(keys.length, 1);
  const [k] = keys;
  // 평문 거래 ID가 키에 노출되지 않는다(해시 적용 확인).
  assert.equal(k.includes('tx-1'), false);
  // prefix·해시·TTL은 사양대로.
  assert.match(k, /^replay:[0-9a-f]{64}$/);
  assert.equal(client._store.get(k).ex, 60);
});
