// 영수증 리플레이 방어 — 한 번 소비한 영수증을 재사용할 수 없게 transactionId를 기록한다.
// has/remember의 두 가지 사용 — 인메모리(단일 인스턴스)와 Redis(서버리스 다중 인스턴스).
//
// 식별자는 hashIdentifier로 해시 후 저장 — 저장소 덤프로도 원본 영수증/거래 ID 식별 불가.
// set membership만 필요한 의미상 손실 없음.

import { hashIdentifier } from './util/hash-id.mjs';

export function createInMemoryReplayStore({
  ttlMs = 30 * 24 * 60 * 60 * 1000, // 영수증 보관: 30일
  max = 100_000,
  now = () => Date.now(),
} = {}) {
  const store = new Map();
  return {
    async has(id) {
      const k = hashIdentifier(id, 'replay');
      const entry = store.get(k);
      if (!entry) return false;
      if (now() > entry.expires) {
        store.delete(k);
        return false;
      }
      return true;
    },
    async remember(id) {
      const k = hashIdentifier(id, 'replay');
      if (store.has(k)) return;
      if (store.size >= max) store.delete(store.keys().next().value);
      store.set(k, { expires: now() + ttlMs });
    },
  };
}

export function createRedisReplayStore({ client, ttlMs = 30 * 24 * 60 * 60 * 1000 } = {}) {
  if (!client) throw new Error('redis client가 필요합니다.');
  const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));
  const key = (id) => `replay:${hashIdentifier(id, 'replay')}`;
  return {
    async has(id) {
      const v = await client.get(key(id));
      return v != null;
    },
    async remember(id) {
      await client.set(key(id), 1, { ex: ttlSec });
    },
  };
}
