// Upstash Redis 기반 레이트리미터(고정 윈도우). 단순·원자적(INCR) — 윈도우 경계에서
// 잠시 2배 버스트 가능하지만 비용/남용 방지엔 충분.
//
// 정책: IP당 windowSec 동안 capacity 회까지 허용. 기본 30회/60초.
// 키는 hashIdentifier로 해시 후 저장 — Redis dump 유출돼도 IP 식별 불가.

import { hashIdentifier } from './util/hash-id.mjs';

export function createRedisRateLimiter({
  client,
  capacity = 30,
  windowSec = 60,
  now = () => Date.now(),
} = {}) {
  if (!client) throw new Error('redis client가 필요합니다.');

  return {
    async allow(key) {
      const hashed = hashIdentifier(key, 'rate-limit');
      const bucket = Math.floor(now() / 1000 / windowSec);
      const k = `rl:${hashed}:${bucket}`;
      const count = await client.incr(k);
      if (count === 1) {
        // 첫 카운트에서만 TTL 부여 — 윈도우 만료 후 자동 정리.
        await client.expire(k, windowSec);
      }
      return count <= capacity;
    },
  };
}
