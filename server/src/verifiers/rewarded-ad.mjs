// 보상형 광고 서버 콜백 검증.
// 일반적인 S2S 광고 콜백 패턴: 광고 서버가 timestamp + payload(트랜잭션 ID/유저 ID 등)를
// 공유 시크릿으로 HMAC-SHA256 서명해 콜백을 보내고, 우리 서버는 같은 시크릿으로 검증한다.
//
// ⚠️ 실제 토스 광고의 콜백 필드명·서명 방식은 운영 시 토스 광고 문서로 맞춰 조정 필요.
//    여기서는 표준 패턴을 둠 — payload, timestamp, signature 세 필드.
//
// 필수 env:
//   AD_CALLBACK_SECRET — 광고 네트워크와 공유하는 시크릿(콘솔에서 발급).

import crypto from 'node:crypto';

export function createRewardedAdVerifier({
  secret,
  maxAgeMs = 5 * 60 * 1000, // 5분
  now = () => Date.now(),
} = {}) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('AD_CALLBACK_SECRET이 필요합니다.');
  }

  return async function verify(proof) {
    const { payload, timestamp, signature } = proof ?? {};
    if (typeof payload !== 'string' || typeof signature !== 'string') {
      return { valid: false, reason: 'payload/signature 누락' };
    }
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      return { valid: false, reason: 'timestamp 형식 오류' };
    }
    const age = now() - ts;
    if (age < 0 || age > maxAgeMs) {
      return { valid: false, reason: '만료되었거나 미래 timestamp' };
    }

    const expected = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest();

    let provided;
    try {
      provided = Buffer.from(signature, 'hex');
    } catch {
      return { valid: false, reason: 'signature 디코드 실패' };
    }
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return { valid: false, reason: 'signature 불일치' };
    }

    return { valid: true, transactionId: payload };
  };
}
