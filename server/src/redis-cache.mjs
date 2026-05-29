// Upstash Redis(또는 Vercel KV) 기반 응답 캐시. 서버리스 다중 인스턴스에서 인메모리 캐시가
// 인스턴스별로 분리되는 문제를 해결한다.
//
// 클라이언트는 @upstash/redis Redis 인스턴스를 주입받는다(앱 부트스트랩에서 생성).
// 모듈 자체는 client만 사용해 단위 테스트가 가짜 client로 가능하다.

export function createRedisCache({ client, ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  if (!client) throw new Error('redis client가 필요합니다.');
  const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));

  return {
    async get(key) {
      const v = await client.get(key);
      // Upstash는 저장된 JSON을 자동 역직렬화해 반환한다. 미존재 시 null.
      return v == null ? undefined : v;
    },
    async set(key, value) {
      await client.set(key, value, { ex: ttlSec });
    },
  };
}
