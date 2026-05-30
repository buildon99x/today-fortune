import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeInput,
  parseStoredInput,
  createInputStore,
  INPUT_STORAGE_KEY,
  _ALLOWED_KEYS,
} from '../persistence/inputStore.mjs';

const valid = { year: 1995, month: 7, day: 15, gender: 'female', type: 'daily' };

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: async (k) => (m.has(k) ? m.get(k) : null),
    setItem: async (k, v) => void m.set(k, v),
    removeItem: async (k) => void m.delete(k),
    _m: m,
  };
}

test('round-trip save→load', async () => {
  const storage = memStorage();
  const store = createInputStore({ storage });
  await store.save(valid);
  assert.deepEqual(await store.load(), valid);
});

test('parseStoredInput: 손상/구버전/잘못된 값 → null(무throw)', () => {
  assert.equal(parseStoredInput('not json'), null);
  assert.equal(parseStoredInput(JSON.stringify({ year: 1995 })), null); // 필드 누락
  assert.equal(parseStoredInput(JSON.stringify({ ...valid, month: 13 })), null); // 범위밖
  assert.equal(parseStoredInput(JSON.stringify({ ...valid, gender: 'x' })), null);
  assert.equal(parseStoredInput(JSON.stringify({ ...valid, type: 'zzz' })), null);
  assert.equal(parseStoredInput(''), null);
  assert.equal(parseStoredInput(null), null);
});

test('빈/손상 저장소 load → null', async () => {
  assert.equal(await createInputStore({ storage: memStorage() }).load(), null);
  const corrupt = memStorage({ [INPUT_STORAGE_KEY]: '{broken' });
  assert.equal(await createInputStore({ storage: corrupt }).load(), null);
});

test('프라이버시: 직렬화에 허용 5키 외 키 없음', () => {
  const raw = serializeInput({ ...valid, deviceId: 'SHOULD_NOT_PERSIST', email: 'x@y.z' });
  const keys = Object.keys(JSON.parse(raw)).sort();
  assert.deepEqual(keys, [..._ALLOWED_KEYS].sort());
  assert.ok(!raw.includes('SHOULD_NOT_PERSIST'));
  assert.ok(!raw.includes('x@y.z'));
});
