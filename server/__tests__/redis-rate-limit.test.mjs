import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRedisRateLimiter } from '../src/redis-rate-limit.mjs';

function fakeRedis() {
  const counts = new Map();
  const expires = new Map();
  return {
    counts,
    expires,
    async incr(k) {
      const next = (counts.get(k) ?? 0) + 1;
      counts.set(k, next);
      return next;
    },
    async expire(k, sec) {
      expires.set(k, sec);
    },
  };
}

test('allows up to capacity then denies within a window', async () => {
  let t = 0;
  const client = fakeRedis();
  const rl = createRedisRateLimiter({ client, capacity: 3, windowSec: 60, now: () => t });
  assert.equal(await rl.allow('ip'), true);
  assert.equal(await rl.allow('ip'), true);
  assert.equal(await rl.allow('ip'), true);
  assert.equal(await rl.allow('ip'), false);
});

test('resets after the window rolls', async () => {
  let t = 0;
  const client = fakeRedis();
  const rl = createRedisRateLimiter({ client, capacity: 1, windowSec: 60, now: () => t });
  assert.equal(await rl.allow('ip'), true);
  assert.equal(await rl.allow('ip'), false);
  t = 60_000; // new window
  assert.equal(await rl.allow('ip'), true);
});

test('only sets expire on the first count of a window', async () => {
  const client = fakeRedis();
  const rl = createRedisRateLimiter({ client, capacity: 5, windowSec: 60, now: () => 0 });
  await rl.allow('ip');
  await rl.allow('ip');
  await rl.allow('ip');
  // exactly one expire entry should be present for this window's key
  assert.equal(client.expires.size, 1);
  assert.equal([...client.expires.values()][0], 60);
});

test('tracks buckets per key', async () => {
  const client = fakeRedis();
  const rl = createRedisRateLimiter({ client, capacity: 1, windowSec: 60, now: () => 0 });
  assert.equal(await rl.allow('a'), true);
  assert.equal(await rl.allow('b'), true);
  assert.equal(await rl.allow('a'), false);
});

test('hashes IP into Redis key — plaintext IP absent (privacy)', async () => {
  const client = fakeRedis();
  const rl = createRedisRateLimiter({ client, capacity: 5, windowSec: 60, now: () => 0 });
  await rl.allow('1.2.3.4');
  const keys = [...client.counts.keys()];
  assert.equal(keys.length, 1);
  const [k] = keys;
  // 평문 IP가 Redis 키에 노출되지 않음
  assert.equal(k.includes('1.2.3.4'), false);
  // prefix·해시·bucket 포맷: rl:<64hex>:<bucket>
  assert.match(k, /^rl:[0-9a-f]{64}:\d+$/);
});
