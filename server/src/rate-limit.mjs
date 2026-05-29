// 토큰 버킷 레이트리미터. 클라이언트별(IP) LLM 호출 폭주/비용 남용 방지.
// 단일 인스턴스 메모리 — 다중 인스턴스에서는 Redis 등 공유 저장소로 교체.
//
// 키는 hashIdentifier로 해시 후 저장 — 프로세스 메모리 덤프로도 IP 식별 불가.

import { hashIdentifier } from './util/hash-id.mjs';

export function createRateLimiter({ capacity = 30, refillPerSec = 0.2, now = () => Date.now() } = {}) {
  const buckets = new Map(); // hashed key -> { tokens, last }

  function allow(key) {
    const k = hashIdentifier(key, 'rate-limit');
    const t = now();
    let b = buckets.get(k);
    if (!b) {
      b = { tokens: capacity, last: t };
      buckets.set(k, b);
    } else {
      const elapsedSec = (t - b.last) / 1000;
      b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec);
      b.last = t;
    }
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return true;
    }
    return false;
  }

  return { allow };
}
