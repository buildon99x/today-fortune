// Apple StoreKit2 검증기 단위 테스트.
// JWS 서명 + Apple Root CA 체인 검증의 happy path는 실제 영수증/인증서가 필요해 여기선 검증하지 않는다.
// 팩토리 검증과 입력 형태 거부 경로를 커버한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppleVerifier } from '../src/verifiers/apple.mjs';

// 임의의 64자리 hex(테스트 전용 더미). 운영에선 Apple Root CA G3의 실제 sha256 지문.
const FAKE_FP = 'A'.repeat(64);

const baseOpts = {
  bundleId: 'com.example.fortune',
  productIds: ['fortune.full_reading'],
  rootCertFingerprint: FAKE_FP,
};

test('factory rejects missing bundleId', async () => {
  await assert.rejects(
    () => createAppleVerifier({ ...baseOpts, bundleId: undefined }),
    /BUNDLE_ID/,
  );
});

test('factory rejects empty productIds', async () => {
  await assert.rejects(() => createAppleVerifier({ ...baseOpts, productIds: [] }), /PRODUCT_IDS/);
});

test('factory rejects missing rootCertFingerprint', async () => {
  await assert.rejects(
    () => createAppleVerifier({ ...baseOpts, rootCertFingerprint: undefined }),
    /FINGERPRINT/,
  );
});

test('factory rejects malformed fingerprint (wrong length)', async () => {
  await assert.rejects(
    () => createAppleVerifier({ ...baseOpts, rootCertFingerprint: 'AB:CD' }),
    /FINGERPRINT/,
  );
});

test('rejects missing signedTransactionInfo', async () => {
  // 빈 jose 스텁 — 이 경로는 jose를 부르지 않음
  const verify = await createAppleVerifier({ ...baseOpts, joseModule: {} });
  const r = await verify({});
  assert.equal(r.valid, false);
  assert.match(r.reason, /signedTransactionInfo/);
});

test('rejects malformed jws (no x5c header)', async () => {
  const fakeJose = {
    decodeProtectedHeader: () => ({ alg: 'ES256' }), // x5c 없음
  };
  const verify = await createAppleVerifier({ ...baseOpts, joseModule: fakeJose });
  const r = await verify({ signedTransactionInfo: 'fake.jws.string' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /x5c/);
});

test('rejects when jws header decode throws', async () => {
  const fakeJose = {
    decodeProtectedHeader: () => {
      throw new Error('not a jws');
    },
  };
  const verify = await createAppleVerifier({ ...baseOpts, joseModule: fakeJose });
  const r = await verify({ signedTransactionInfo: 'garbage' });
  assert.equal(r.valid, false);
  assert.match(r.reason, /디코드|jws/);
});
