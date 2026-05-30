// 상태코드 → 한국어 메시지 일원화. fortuneApi.ts의 인라인 throw와 ResultScreen의
// FALLBACK_* 를 한 곳으로 모아 copy를 fetch 흐름에서 분리한다. 문구는 i18n 테이블 단일 출처.

import { createTranslator } from '../i18n/index.mjs';

const t = createTranslator();

export const FALLBACK_LOAD_ERROR = t('errors.loadFallback');
export const FALLBACK_UNLOCK_ERROR = t('errors.unlockFallback');

/**
 * 무료 운세 조회 에러 메시지. 400은 서버가 준 한국어 메시지를 우선한다.
 * @param {number} status
 * @param {string} [serverError]
 */
export function fortuneErrorFor(status, serverError) {
  if (status === 429) return t('errors.rateLimited');
  if (status === 400) return serverError || t('errors.badInput');
  return FALLBACK_LOAD_ERROR;
}

/** 프리미엄 해제 에러 메시지. 501은 "준비 중" 안내. */
export function unlockErrorFor(status) {
  if (status === 501) return t('errors.unlockNotReady');
  return FALLBACK_UNLOCK_ERROR;
}
