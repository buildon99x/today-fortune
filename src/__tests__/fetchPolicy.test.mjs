import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldRetry,
  nextDelay,
  createResilientFetch,
  DEFAULT_FORTUNE_POLICY,
} from '../services/fetchPolicy.mjs';

test('shouldRetry: 429/5xx/네트워크는 재시도, 4xx 계약 에러는 비재시도', () => {
  assert.equal(shouldRetry(429, 0, 2), true);
  assert.equal(shouldRetry(503, 0, 2), true);
  assert.equal(shouldRetry(null, 0, 2), true); // 네트워크
  assert.equal(shouldRetry(400, 0, 2), false);
  assert.equal(shouldRetry(501, 0, 2), false);
  assert.equal(shouldRetry(500, 2, 2), false); // 소진
});

test('nextDelay: 인덱스 조회 + 끝 클램프', () => {
  assert.equal(nextDelay(0, [1000, 3000]), 1000);
  assert.equal(nextDelay(1, [1000, 3000]), 3000);
  assert.equal(nextDelay(5, [1000, 3000]), 3000);
  assert.equal(nextDelay(0, []), 0);
});

// 가짜 의존성 — 실제 타이머/네트워크 없이 결정 로직만 검증.
function fakeDeps(fetchImpl) {
  return {
    fetch: fetchImpl,
    AbortController: class {
      constructor() {
        this.signal = { aborted: false };
      }
      abort() {
        this.signal.aborted = true;
      }
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
    sleep: async () => {},
    policy: { ...DEFAULT_FORTUNE_POLICY, backoffMs: [0, 0] },
  };
}

test('2회 실패(500) 후 200 → 성공', async () => {
  let n = 0;
  const request = createResilientFetch(
    fakeDeps(async () => {
      n += 1;
      return n < 3 ? { ok: false, status: 500 } : { ok: true, status: 200 };
    }),
  );
  const res = await request('u');
  assert.equal(res.status, 200);
  assert.equal(n, 3);
});

test('항상 500 → 재시도 소진 후 마지막 응답 반환', async () => {
  const request = createResilientFetch(fakeDeps(async () => ({ ok: false, status: 500 })));
  const res = await request('u');
  assert.equal(res.status, 500); // maxRetries 소진 후 비재시도 → 그대로 반환
});

test('400은 즉시 반환(재시도 안 함)', async () => {
  let n = 0;
  const request = createResilientFetch(
    fakeDeps(async () => {
      n += 1;
      return { ok: false, status: 400 };
    }),
  );
  const res = await request('u');
  assert.equal(res.status, 400);
  assert.equal(n, 1);
});

test('네트워크 에러 지속 → NetworkError throw', async () => {
  const request = createResilientFetch(
    fakeDeps(async () => {
      throw new Error('boom');
    }),
  );
  await assert.rejects(request('u'), (e) => e.name === 'NetworkError');
});

test('Abort → TimeoutError throw', async () => {
  const request = createResilientFetch(
    fakeDeps(async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }),
  );
  await assert.rejects(request('u'), (e) => e.name === 'TimeoutError');
});
