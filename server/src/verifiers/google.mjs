// Google Play Billing 영수증 검증.
// 클라이언트는 purchaseToken + productId를 서버로 보낸다.
// 서버는 서비스 계정 JWT로 OAuth 토큰을 받아 Play Developer API에 purchaseState를 확인한다.
//
// 필수 env:
//   GOOGLE_SERVICE_ACCOUNT_JSON  — 서비스 계정 JSON 문자열 (Play Console 권한 부여 필요)
//   GOOGLE_PACKAGE_NAME          — Android 패키지명 (예: com.example.fortune)
//   GOOGLE_PRODUCT_IDS           — 허용 상품 ID 콤마 구분
//
// fetchImpl/signJwt는 테스트 주입용. 실제 동작은 node fetch + RS256 서명.

import crypto from 'node:crypto';

const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function defaultSignJwt(claim, privateKeyPem) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const sig = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKeyPem);
  return `${signingInput}.${base64url(sig)}`;
}

export function createGoogleVerifier({
  serviceAccountJson,
  packageName,
  productIds,
  fetchImpl = globalThis.fetch,
  signJwt = defaultSignJwt,
  now = () => Date.now(),
} = {}) {
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON이 필요합니다.');
  if (!packageName) throw new Error('GOOGLE_PACKAGE_NAME이 필요합니다.');
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('GOOGLE_PRODUCT_IDS가 필요합니다.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('fetch가 필요합니다.');

  const sa =
    typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  if (!sa.client_email || !sa.private_key) {
    throw new Error('서비스 계정 JSON에 client_email/private_key가 없습니다.');
  }
  const allowed = new Set(productIds);

  async function getAccessToken() {
    const iat = Math.floor(now() / 1000);
    const claim = {
      iss: sa.client_email,
      scope: SCOPE,
      aud: OAUTH_URL,
      iat,
      exp: iat + 3600,
    };
    const jwt = signJwt(claim, sa.private_key);
    const res = await fetchImpl(OAUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    if (!res.ok) throw new Error(`oauth ${res.status}`);
    const data = await res.json();
    if (!data.access_token) throw new Error('access_token 없음');
    return data.access_token;
  }

  return async function verify(proof) {
    if (!proof?.purchaseToken || typeof proof.purchaseToken !== 'string') {
      return { valid: false, reason: 'purchaseToken 누락' };
    }
    if (!proof?.productId || typeof proof.productId !== 'string') {
      return { valid: false, reason: 'productId 누락' };
    }
    if (!allowed.has(proof.productId)) {
      return { valid: false, reason: 'productId가 허용 목록에 없음' };
    }

    let token;
    try {
      token = await getAccessToken();
    } catch (e) {
      return { valid: false, reason: `oauth 실패: ${e.message}` };
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
      packageName,
    )}/purchases/products/${encodeURIComponent(proof.productId)}/tokens/${encodeURIComponent(proof.purchaseToken)}`;

    let res;
    try {
      res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      return { valid: false, reason: `play api 네트워크 실패: ${e.message}` };
    }
    if (!res.ok) return { valid: false, reason: `play api ${res.status}` };
    const data = await res.json();

    // purchaseState: 0 = 구매됨, 1 = 취소, 2 = 보류
    if (data.purchaseState !== 0) {
      return { valid: false, reason: `purchaseState=${data.purchaseState}` };
    }

    return {
      valid: true,
      transactionId: data.orderId ?? proof.purchaseToken,
      productId: proof.productId,
    };
  };
}
