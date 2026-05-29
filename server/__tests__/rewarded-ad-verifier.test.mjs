import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRewardedAdVerifier } from '../src/verifiers/rewarded-ad.mjs';

const SECRET = 'shared-secret';

function sign(timestamp, payload, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

test('factory requires secret', () => {
  assert.throws(() => createRewardedAdVerifier({}), /AD_CALLBACK_SECRET/);
});

test('rejects missing fields', async () => {
  const v = createRewardedAdVerifier({ secret: SECRET, now: () => 0 });
  assert.equal((await v({})).valid, false);
  assert.equal((await v({ payload: 'p' })).valid, false);
  assert.equal((await v({ payload: 'p', signature: 's' })).valid, false);
});

test('rejects expired timestamp', async () => {
  const t = 1_000_000;
  const v = createRewardedAdVerifier({ secret: SECRET, maxAgeMs: 5_000, now: () => t });
  const oldTs = t - 6_000;
  const r = await v({ payload: 'tx-1', timestamp: oldTs, signature: sign(oldTs, 'tx-1') });
  assert.equal(r.valid, false);
  assert.match(r.reason, /만료|미래/);
});

test('rejects future timestamp', async () => {
  const t = 1_000_000;
  const v = createRewardedAdVerifier({ secret: SECRET, maxAgeMs: 5_000, now: () => t });
  const futureTs = t + 1_000;
  const r = await v({ payload: 'tx-1', timestamp: futureTs, signature: sign(futureTs, 'tx-1') });
  assert.equal(r.valid, false);
});

test('rejects bad signature', async () => {
  const t = 1_000_000;
  const v = createRewardedAdVerifier({ secret: SECRET, now: () => t });
  const r = await v({ payload: 'tx-1', timestamp: t, signature: 'deadbeef'.repeat(8) });
  assert.equal(r.valid, false);
  assert.match(r.reason, /signature/);
});

test('happy path returns transactionId = payload', async () => {
  const t = 1_000_000;
  const v = createRewardedAdVerifier({ secret: SECRET, now: () => t });
  const r = await v({ payload: 'tx-42', timestamp: t, signature: sign(t, 'tx-42') });
  assert.deepEqual(r, { valid: true, transactionId: 'tx-42' });
});

test('different secret fails verification', async () => {
  const t = 1_000_000;
  const v = createRewardedAdVerifier({ secret: SECRET, now: () => t });
  const sigWrong = sign(t, 'tx-1', 'other-secret');
  const r = await v({ payload: 'tx-1', timestamp: t, signature: sigWrong });
  assert.equal(r.valid, false);
});
