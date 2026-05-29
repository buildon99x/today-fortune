// 개인정보·식별자 해시화 헬퍼.
//
// 모든 캐시/레이트리밋/리플레이 키를 평문 대신 다이제스트로 저장하기 위한 단일 진실.
// PRIVACY_HMAC_SECRET 가 있으면 HMAC-SHA256, 없으면 SHA-256 폴백 + 부팅 경고 1회.
//
// 왜 HMAC인가:
//   - IPv4(2^32) 또는 생년월일 공간(~40만)은 단순 SHA-256으로는 무작위 대입 가능.
//   - HMAC는 시크릿을 모르면 사전 계산 불가 — Redis dump 유출 시에도 식별 불가.
//   - 시크릿은 Vercel/Upstash 등 외부 키 저장소에서만 보유.
//
// namespace 사용:
//   동일 입력값이라도 사용 맥락(fortune-cache vs replay 등)이 다르면 다른 키가 되도록 분리.
//   예: 같은 사용자가 같은 날 운세를 조회하고 영수증을 제출해도 두 키는 무관.

import { createHash, createHmac } from 'node:crypto';

let warnedFallback = false;

/**
 * @param {string} value      식별자(평문)
 * @param {string} [namespace] 맥락 prefix (예: 'fortune-cache', 'rate-limit', 'replay')
 * @returns {string} 64자 hex
 */
export function hashIdentifier(value, namespace = '') {
  // \0 구분자를 무조건 적용 — namespace=''인 경우와 namespace 있는 경우의 충돌 가능성 차단.
  // 예: hashIdentifier('a\0b','') vs hashIdentifier('b','a') 가 다른 해시가 되도록.
  const input = `${namespace}\0${String(value)}`;
  const secret = process.env.PRIVACY_HMAC_SECRET;
  if (secret) {
    return createHmac('sha256', secret).update(input).digest('hex');
  }
  if (!warnedFallback) {
    console.warn(
      '[privacy] PRIVACY_HMAC_SECRET 미설정 — SHA-256 폴백 사용. ' +
        '운영에선 32바이트 이상 랜덤 시크릿을 반드시 설정하세요 ' +
        '(예: `openssl rand -hex 32` 결과를 Vercel env에 저장).',
    );
    warnedFallback = true;
  }
  return createHash('sha256').update(input).digest('hex');
}

/**
 * 부팅 시 호출 — production에서 HMAC 시크릿이 없으면 throw(fail-closed).
 * 시크릿이 너무 짧으면 경고. 운영 인스턴스가 silent SHA-256 폴백으로 떠 있는 것을 차단.
 */
export function assertPrivacyReady() {
  const secret = process.env.PRIVACY_HMAC_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error(
      'PRIVACY_HMAC_SECRET이 운영(NODE_ENV=production)에서 반드시 필요합니다. ' +
        'SHA-256 폴백은 IPv4/생년월일 공간을 무작위 대입으로 역산 가능합니다. ' +
        '`openssl rand -hex 32` 결과를 env에 설정하세요.',
    );
  }
  if (secret && secret.length < 32) {
    console.warn(
      `[privacy] PRIVACY_HMAC_SECRET 길이 ${secret.length}자 — 32자 이상 권장(엔트로피).`,
    );
  }
}

/** 테스트용 — 부팅 경고 플래그 초기화. */
export function _resetPrivacyWarnings() {
  warnedFallback = false;
}
