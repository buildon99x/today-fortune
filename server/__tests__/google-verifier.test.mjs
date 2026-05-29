import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleVerifier } from '../src/verifiers/google.mjs';

const sa = { client_email: 'svc@proj.iam.gserviceaccount.com', private_key: 'fake-key' };
const baseOpts = {
  serviceAccountJson: sa,
  packageName: 'com.example.fortune',
  productIds: ['fortune.full_reading'],
};

function mockFetch(handlers) {
  return async (url, init) => {
    for (const { match, response } of handlers) {
      if (match(url, init)) return response;
    }
    throw new Error(`no mock for ${url}`);
  };
}
function jsonResp(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('factory rejects missing service account JSON / package / products', () => {
  assert.throws(() => createGoogleVerifier({}), /SERVICE_ACCOUNT/);
  assert.throws(() => createGoogleVerifier({ serviceAccountJson: sa }), /PACKAGE/);
  assert.throws(
    () => createGoogleVerifier({ serviceAccountJson: sa, packageName: 'p', productIds: [] }),
    /PRODUCT/,
  );
});

test('rejects missing purchaseToken / productId', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    fetchImpl: async () => jsonResp(200, {}),
    signJwt: () => 'jwt',
  });
  assert.deepEqual(await verify({}), { valid: false, reason: 'purchaseToken 누락' });
  assert.deepEqual(await verify({ purchaseToken: 't' }), {
    valid: false,
    reason: 'productId 누락',
  });
});

test('rejects productId not in allow-list', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    fetchImpl: async () => jsonResp(200, {}),
    signJwt: () => 'jwt',
  });
  const r = await verify({ purchaseToken: 't', productId: 'other' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /허용/);
});

test('happy path: oauth + play api success', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    signJwt: () => 'signed-jwt',
    fetchImpl: mockFetch([
      {
        match: (u) => u === 'https://oauth2.googleapis.com/token',
        response: jsonResp(200, { access_token: 'tkn' }),
      },
      {
        match: (u) => u.includes('/androidpublisher/'),
        response: jsonResp(200, { purchaseState: 0, orderId: 'GPA.1234' }),
      },
    ]),
  });
  const r = await verify({ purchaseToken: 'pt', productId: 'fortune.full_reading' });
  assert.deepEqual(r, {
    valid: true,
    transactionId: 'GPA.1234',
    productId: 'fortune.full_reading',
  });
});

test('rejects when purchaseState != 0 (canceled/pending)', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    signJwt: () => 'signed-jwt',
    fetchImpl: mockFetch([
      { match: (u) => u.endsWith('/token'), response: jsonResp(200, { access_token: 'tkn' }) },
      {
        match: (u) => u.includes('/androidpublisher/'),
        response: jsonResp(200, { purchaseState: 1 }),
      },
    ]),
  });
  const r = await verify({ purchaseToken: 'pt', productId: 'fortune.full_reading' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /purchaseState=1/);
});

test('rejects on oauth failure', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    signJwt: () => 'jwt',
    fetchImpl: mockFetch([
      { match: (u) => u.endsWith('/token'), response: jsonResp(401, { error: 'unauthorized' }) },
    ]),
  });
  const r = await verify({ purchaseToken: 'pt', productId: 'fortune.full_reading' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /oauth/);
});

test('rejects on play api non-2xx', async () => {
  const verify = createGoogleVerifier({
    ...baseOpts,
    signJwt: () => 'jwt',
    fetchImpl: mockFetch([
      { match: (u) => u.endsWith('/token'), response: jsonResp(200, { access_token: 't' }) },
      { match: (u) => u.includes('/androidpublisher/'), response: jsonResp(404, {}) },
    ]),
  });
  const r = await verify({ purchaseToken: 'pt', productId: 'fortune.full_reading' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /404/);
});
