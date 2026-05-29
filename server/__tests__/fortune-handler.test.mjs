import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFortuneHandler, makeCacheKey } from '../src/fortune-handler.mjs';
import { createCache } from '../src/cache.mjs';

const FORTUNE_JSON = JSON.stringify({
  acknowledgement: '오늘 마음에 잔잔한 결이 비치네요',
  headline: '오늘은 기회의 날',
  sections: [
    { title: '총운', body: '안정적입니다.' },
    { title: '관계운', body: '대화가 잘 풀립니다.' },
    { title: '흐름과 변화', body: '작은 변화가 신호입니다.' },
  ],
  luckyItems: { color: '초록', number: 3, direction: '남' },
  advice: '서두르지 마세요.',
});

const goodProfile = { year: 1990, month: 5, day: 20, gender: 'female' };

function makeHandler(overrides = {}) {
  const calls = { llm: 0 };
  const llm = overrides.llm ?? (async () => {
    calls.llm += 1;
    return FORTUNE_JSON;
  });
  const handler = createFortuneHandler({
    llm,
    cache: overrides.cache,
    rateLimiter: overrides.rateLimiter,
    promptVersion: overrides.promptVersion,
    now: () => new Date('2026-05-26T00:00:00Z'),
  });
  return { handler, calls };
}

test('400 when profile missing', async () => {
  const { handler } = makeHandler();
  const r = await handler.getFortune({ body: {} });
  assert.equal(r.status, 400);
});

test('400 with Korean message for an invalid birthdate', async () => {
  const { handler } = makeHandler();
  const r = await handler.getFortune({ body: { profile: { year: 2026, month: 2, day: 30 } } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /2월/);
});

test('200 returns free portion only — premium is not leaked', async () => {
  const { handler } = makeHandler();
  const r = await handler.getFortune({ body: { profile: goodProfile, options: { type: 'daily' } } });
  assert.equal(r.status, 200);
  assert.equal(r.body.acknowledgement, '오늘 마음에 잔잔한 결이 비치네요');
  assert.equal(r.body.headline, '오늘은 기회의 날');
  assert.equal(r.body.sections.length, 1); // only the first section
  assert.equal(r.body.locked, true);
  assert.equal(r.body.meta.type, 'daily');
  assert.equal(r.body.advice, undefined); // premium field absent
  assert.equal(r.body.luckyItems, undefined);
});

test('cache prevents a second llm call for identical input', async () => {
  const cache = createCache();
  const { handler, calls } = makeHandler({ cache });
  const body = { profile: goodProfile, options: { type: 'daily' } };
  await handler.getFortune({ body });
  await handler.getFortune({ body });
  assert.equal(calls.llm, 1);
});

test('429 when rate limiter denies', async () => {
  const rateLimiter = { allow: () => false };
  const { handler } = makeHandler({ rateLimiter });
  const r = await handler.getFortune({ body: { profile: goodProfile }, ip: '1.2.3.4' });
  assert.equal(r.status, 429);
});

test('502 when the llm fails', async () => {
  const { handler } = makeHandler({ llm: async () => { throw new Error('upstream down'); } });
  const r = await handler.getFortune({ body: { profile: goodProfile } });
  assert.equal(r.status, 502);
});

test('unlock returns 501 when no proof verifier is wired', async () => {
  const { handler } = makeHandler();
  const r = await handler.unlock({ body: { profile: goodProfile, proof: { type: 'iap', receipt: 'x' } } });
  assert.equal(r.status, 501);
});

test('unlock returns premium when proof verifies', async () => {
  const { handler } = makeHandler({ cache: createCache() });
  const r = await handler.unlock({
    body: { profile: goodProfile, options: { type: 'daily' } },
    verifyProof: async () => true,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.sections.length, 2); // sections after the first
  assert.equal(r.body.advice, '서두르지 마세요.');
  assert.equal(r.body.luckyItems.number, 3);
});

test('unlock returns 402 when proof fails verification', async () => {
  const { handler } = makeHandler();
  const r = await handler.unlock({
    body: { profile: goodProfile },
    verifyProof: async () => false,
  });
  assert.equal(r.status, 402);
});

// === Prompt versioning + cache key ===

test('makeCacheKey changes when promptVersion changes', () => {
  const p = { year: 1990, month: 5, day: 20 };
  const k1 = makeCacheKey(p, 'daily', '2026-05-26', 'v1');
  const k2 = makeCacheKey(p, 'daily', '2026-05-26', 'v2');
  assert.notEqual(k1, k2);
});

test('makeCacheKey stable for same inputs', () => {
  const p = { year: 1990, month: 5, day: 20, gender: 'female' };
  const k1 = makeCacheKey(p, 'daily', '2026-05-26', 'v1');
  const k2 = makeCacheKey(p, 'daily', '2026-05-26', 'v1');
  assert.equal(k1, k2);
});

test('makeCacheKey returns hashed hex (no plaintext PII)', () => {
  const p = { year: 1990, month: 5, day: 20, gender: 'female' };
  const k = makeCacheKey(p, 'daily', '2026-05-26', 'v1');
  // 64자 lowercase hex — JSON·평문 PII가 키에 나타나지 않음.
  assert.match(k, /^[0-9a-f]{64}$/);
  assert.equal(k.includes('1990'), false);
  assert.equal(k.includes('female'), false);
  assert.equal(k.includes('daily'), false);
});

test('cache invalidates across promptVersion change', async () => {
  const cache = createCache();
  const { handler: h1, calls } = makeHandler({ cache, promptVersion: 'v-old' });
  const { handler: h2 } = makeHandler({ cache, promptVersion: 'v-new', llm: async () => {
    calls.llm += 1; return FORTUNE_JSON;
  } });
  await h1.getFortune({ body: { profile: goodProfile } });
  await h2.getFortune({ body: { profile: goodProfile } });
  // Different versions → both call the llm (no cache reuse)
  assert.equal(calls.llm, 2);
});

test('free response meta includes promptVersion', async () => {
  const { handler } = makeHandler({ promptVersion: 'test-v42' });
  const r = await handler.getFortune({ body: { profile: goodProfile } });
  assert.equal(r.body.meta.promptVersion, 'test-v42');
});
