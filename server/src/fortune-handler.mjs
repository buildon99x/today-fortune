// 운세 요청 핸들러 — 프레임워크 비의존 순수 함수(의존성 주입). 단위 테스트 대상.
// 흐름: 레이트리밋 → 입력 검증 → 캐시 조회 → 엔진(검증·프롬프트·LLM·파싱) → 캐시 저장 → 무료 부분만 반환.
// 프리미엄은 반환하지 않는다(클라이언트로 유료 콘텐츠 유출 방지). 캐시엔 전체를 보관해 해제 시 재생성 없이 제공.

import { createFortuneEngine } from '../core/fortune.mjs';
import { firstBirthInputError } from '../core/validate.mjs';
import { PROMPT_VERSION } from '../core/prompt.mjs';
import { hashIdentifier } from './util/hash-id.mjs';

/**
 * 응답 캐시 키. promptVersion이 포함되어 프롬프트가 개정되면 캐시가 자동 무효화된다.
 * 반환값은 HMAC-SHA256 hex(64자) — 캐시 스토어에 평문 PII가 들어가지 않는다.
 * 테스트가 직접 호출할 수 있도록 export.
 */
export function makeCacheKey(profile, type, date, promptVersion) {
  const canonical = JSON.stringify({
    y: profile.year,
    m: profile.month,
    d: profile.day,
    h: profile.hour ?? null,
    g: profile.gender ?? 'unspecified',
    c: profile.calendar ?? 'solar',
    type,
    date,
    pv: promptVersion,
  });
  return hashIdentifier(canonical, 'fortune-cache');
}

export function createFortuneHandler({
  llm,
  cache,
  rateLimiter,
  promptVersion = PROMPT_VERSION,
  now = () => new Date(),
} = {}) {
  const engine = createFortuneEngine({ llm });

  async function generate(profile, type) {
    const date = now().toISOString().slice(0, 10);
    const key = makeCacheKey(profile, type, date, promptVersion);
    let full = await cache?.get(key);
    if (!full) {
      full = await engine.getFortune(profile, { type, date });
      await cache?.set(key, full);
    }
    // 핸들러의 promptVersion이 API 응답·캐시 키의 단일 진실. meta에 일관되게 노출.
    return { ...full, meta: { ...full.meta, promptVersion } };
  }

  return {
    /** POST /api/fortune — 무료 부분만 반환 */
    async getFortune({ body, ip = 'anon' } = {}) {
      if (rateLimiter && !(await rateLimiter.allow(ip))) {
        return { status: 429, body: { error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' } };
      }
      const profile = body?.profile;
      if (!profile || typeof profile !== 'object') {
        return { status: 400, body: { error: 'profile이 필요합니다.' } };
      }
      const inputError = firstBirthInputError(profile);
      if (inputError) return { status: 400, body: { error: inputError } };

      const type = body?.options?.type ?? 'daily';
      try {
        const full = await generate(profile, type);
        return { status: 200, body: { ...full.free, meta: full.meta } };
      } catch {
        return { status: 502, body: { error: '운세를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.' } };
      }
    },

    /**
     * POST /api/fortune/unlock — 프리미엄 해제.
     * 영수증/광고 토큰 검증은 미구현(501). 실제 구현 시: proof를 검증한 뒤에만
     * generate()로 전체를 만들어 premium 부분을 반환할 것. 검증 없는 반환은 금지.
     */
    async unlock({ body, verifyProof } = {}) {
      const profile = body?.profile;
      const proof = body?.proof;
      if (!profile || typeof profile !== 'object') {
        return { status: 400, body: { error: 'profile이 필요합니다.' } };
      }
      if (firstBirthInputError(profile)) {
        return { status: 400, body: { error: '입력을 확인해 주세요.' } };
      }
      if (typeof verifyProof !== 'function') {
        // 영수증/광고 토큰 검증기가 주입되지 않음 — 미구현.
        return { status: 501, body: { error: '프리미엄 해제는 영수증 검증 연동 후 제공됩니다.' } };
      }
      const ok = await verifyProof(proof);
      if (!ok) return { status: 402, body: { error: '결제/시청 확인에 실패했어요.' } };

      const type = body?.options?.type ?? 'daily';
      try {
        const full = await generate(profile, type);
        return { status: 200, body: full.premium };
      } catch {
        return { status: 502, body: { error: '운세를 생성하지 못했어요. 잠시 후 다시 시도해 주세요.' } };
      }
    },
  };
}
