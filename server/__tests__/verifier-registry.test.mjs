import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerifier } from '../src/verifiers/registry.mjs';
import { createInMemoryReplayStore } from '../src/replay-store.mjs';

const silentLog = { warn: () => {} };

function okVerifier(transactionId = 'tx-1', productId = 'p1') {
  return async () => ({ valid: true, transactionId, productId });
}

test('requires a verifiers map', () => {
  assert.throws(() => createVerifier({}), /verifiers/);
});

test('returns false for missing proof or type', async () => {
  const v = createVerifier({ verifiers: {}, log: silentLog });
  assert.equal(await v(null), false);
  assert.equal(await v({}), false);
  assert.equal(await v({ type: 123 }), false);
});

test('returns false for unregistered type', async () => {
  const v = createVerifier({ verifiers: { iap_apple: okVerifier() }, log: silentLog });
  assert.equal(await v({ type: 'iap_google' }), false);
});

test('returns true when verifier validates', async () => {
  const v = createVerifier({ verifiers: { iap_apple: okVerifier() }, log: silentLog });
  assert.equal(await v({ type: 'iap_apple' }), true);
});

test('returns false when verifier rejects', async () => {
  const reject = async () => ({ valid: false, reason: 'bad' });
  const v = createVerifier({ verifiers: { iap_apple: reject }, log: silentLog });
  assert.equal(await v({ type: 'iap_apple' }), false);
});

test('catches verifier exceptions and rejects', async () => {
  const boom = async () => {
    throw new Error('upstream down');
  };
  const v = createVerifier({ verifiers: { iap_apple: boom }, log: silentLog });
  assert.equal(await v({ type: 'iap_apple' }), false);
});

test('replay protection: second use of the same receipt is rejected', async () => {
  const replayStore = createInMemoryReplayStore();
  const v = createVerifier({
    verifiers: { iap_apple: okVerifier('tx-once') },
    replayStore,
    log: silentLog,
  });
  assert.equal(await v({ type: 'iap_apple' }), true);
  assert.equal(await v({ type: 'iap_apple' }), false);
});

test('replay: different transactions are independent', async () => {
  const replayStore = createInMemoryReplayStore();
  let counter = 0;
  const v = createVerifier({
    verifiers: {
      iap_apple: async () => ({ valid: true, transactionId: `tx-${++counter}` }),
    },
    replayStore,
    log: silentLog,
  });
  assert.equal(await v({ type: 'iap_apple' }), true);
  assert.equal(await v({ type: 'iap_apple' }), true);
});

test('replay: rejects when verifier returns no transactionId', async () => {
  const replayStore = createInMemoryReplayStore();
  const v = createVerifier({
    verifiers: { iap_apple: async () => ({ valid: true }) },
    replayStore,
    log: silentLog,
  });
  assert.equal(await v({ type: 'iap_apple' }), false);
});
