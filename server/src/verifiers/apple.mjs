// Apple StoreKit2 영수증 검증.
// 클라이언트(앱)는 StoreKit2의 verificationResult에서 signedTransactionInfo(JWS)를 받아 서버로 보낸다.
// 서버는: x5c 인증서 체인 내 서명 검증 → 체인 루트가 Apple Root CA의 SHA-256 fingerprint와 일치하는지 →
//        리프 인증서로 JWS 서명 검증 → payload 클레임(bundleId, productId) 검사.
//
// 필수 env:
//   APPLE_BUNDLE_ID                     — 앱 번들 ID (App Store Connect)
//   APPLE_PRODUCT_IDS                   — 허용 상품 ID 콤마 구분
//   APPLE_ROOT_CERT_FINGERPRINT_SHA256  — Apple Root CA G3의 sha256 지문(콜론 포함 hex, Apple 공개)
//                                         또는 APPLE_ROOT_CERT_PEM을 두면 app.mjs가 지문을 계산.

import { X509Certificate, createPublicKey } from 'node:crypto';

function normalizeFingerprint(fp) {
  // 'AB:CD:...' 또는 'abcd...' 양쪽 모두 허용 → 콜론 포함 대문자로 통일.
  if (typeof fp !== 'string') return null;
  const hex = fp.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 64) return null;
  return hex.match(/.{2}/g).join(':');
}

export async function createAppleVerifier({
  bundleId,
  productIds,
  rootCertFingerprint,
  joseModule, // 테스트 주입용 — 미주입 시 동적 import
} = {}) {
  if (!bundleId) throw new Error('APPLE_BUNDLE_ID가 필요합니다.');
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('APPLE_PRODUCT_IDS가 필요합니다.');
  }
  const trustedFp = normalizeFingerprint(rootCertFingerprint);
  if (!trustedFp) {
    throw new Error('APPLE_ROOT_CERT_FINGERPRINT_SHA256이 필요합니다 (sha256 hex).');
  }

  const allowed = new Set(productIds);
  const jose = joseModule ?? (await import('jose'));

  return async function verify(proof) {
    const jws = proof?.signedTransactionInfo;
    if (typeof jws !== 'string' || !jws) {
      return { valid: false, reason: 'signedTransactionInfo 누락' };
    }

    let header;
    try {
      header = jose.decodeProtectedHeader(jws);
    } catch {
      return { valid: false, reason: 'jws 헤더 디코드 실패' };
    }
    if (!Array.isArray(header.x5c) || header.x5c.length === 0) {
      return { valid: false, reason: 'x5c 인증서 체인 없음' };
    }

    // x5c 체인 — 각 항목은 DER base64. 리프(0) → 중간 → 루트 순.
    let certs;
    try {
      certs = header.x5c.map((b64) => new X509Certificate(Buffer.from(b64, 'base64')));
    } catch {
      return { valid: false, reason: '인증서 파싱 실패' };
    }

    // 체인 서명 검증: 각 cert가 다음 cert의 공개키로 서명됐는지.
    for (let i = 0; i < certs.length - 1; i++) {
      const parentKey = certs[i + 1].publicKey;
      if (!certs[i].verify(parentKey)) {
        return { valid: false, reason: `체인 검증 실패 (idx ${i})` };
      }
    }

    // 체인의 루트가 신뢰하는 Apple Root와 일치하는지(fingerprint 비교).
    const chainRoot = certs[certs.length - 1];
    if (chainRoot.fingerprint256 !== trustedFp) {
      return { valid: false, reason: '체인 루트가 Apple Root와 불일치' };
    }

    // 리프 인증서로 JWS 서명 검증.
    let payload;
    try {
      const leafKey = createPublicKey(certs[0].publicKey);
      const { payload: p } = await jose.jwtVerify(jws, leafKey);
      payload = p;
    } catch {
      return { valid: false, reason: 'jws 서명 검증 실패' };
    }

    if (payload.bundleId !== bundleId) {
      return { valid: false, reason: 'bundleId 불일치' };
    }
    if (typeof payload.productId !== 'string' || !allowed.has(payload.productId)) {
      return { valid: false, reason: 'productId가 허용 목록에 없음' };
    }
    if (typeof payload.transactionId !== 'string' && typeof payload.transactionId !== 'number') {
      return { valid: false, reason: 'transactionId 누락' };
    }

    return {
      valid: true,
      transactionId: String(payload.transactionId),
      productId: payload.productId,
    };
  };
}
