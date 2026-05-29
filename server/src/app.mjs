// Hono 앱 정의(리스닝 없음). 로컬 dev는 server.mjs, Vercel은 api/index.mjs가 사용.
//
// 스토리지: env로 자동 선택(Upstash/KV → Redis, 아니면 인메모리).
// 검증기:   env가 있는 플랫폼만 등록되고 리플레이 방어가 자동 적용된다.
//          하나도 등록되지 않으면 /api/fortune/unlock 은 501 반환(미구성 명시).

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { createFortuneHandler } from './fortune-handler.mjs';
import { PROMPT_VERSION } from '../core/prompt.mjs';
import { pickFortuneLlm, describeProvider } from './llm-router.mjs';
import { globalUsageTracker } from './usage-tracker.mjs';
import { assertPrivacyReady } from './util/hash-id.mjs';

// 부팅 첫 줄에서 production 가드 — HMAC 시크릿 없으면 즉시 throw.
// 인스턴스가 silent SHA-256 폴백으로 떠 있는 상태 차단.
assertPrivacyReady();
import { createCache } from './cache.mjs';
import { createRateLimiter } from './rate-limit.mjs';
import { createRedisCache } from './redis-cache.mjs';
import { createRedisRateLimiter } from './redis-rate-limit.mjs';
import { createVerifier } from './verifiers/registry.mjs';
import { createInMemoryReplayStore, createRedisReplayStore } from './replay-store.mjs';
import { createGoogleVerifier } from './verifiers/google.mjs';
import { createRewardedAdVerifier } from './verifiers/rewarded-ad.mjs';

// 캐시 TTL 정책: 기본 0(완전 휘발). 양수면 응답 캐시 활성.
//
// 기본 0인 이유: 캐시 적중 여부가 응답시간 차이(LLM ~30s vs 캐시 ~0ms)로 노출돼
// "특정 프로필이 이미 조회됐는가" oracle이 됨. 가족·지인·유출 명단 대조 공격 표면.
// 사용자가 명시한 "휘발" 정책과도 일치. 비용 절감이 필요하면 운영자가 명시적으로 활성화.
const CACHE_TTL_SEC = (() => {
  const raw = process.env.FORTUNE_CACHE_TTL_SEC;
  if (raw === undefined || raw === '') return 0; // 휘발 기본
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
})();
const CACHE_ENABLED = CACHE_TTL_SEC > 0;

async function buildStorage() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  const ttlMs = CACHE_TTL_SEC * 1000;

  if (url && token) {
    try {
      const { Redis } = await import('@upstash/redis');
      const client = new Redis({ url, token });
      return {
        mode: 'redis',
        client,
        cache: CACHE_ENABLED ? createRedisCache({ client, ttlMs }) : null,
        rateLimiter: createRedisRateLimiter({ client, capacity: 30, windowSec: 60 }),
      };
    } catch (e) {
      console.warn('[storage] Upstash env 있으나 @upstash/redis 미설치 — 인메모리로 폴백:', e.message);
    }
  }
  return {
    mode: 'memory',
    client: null,
    cache: CACHE_ENABLED ? createCache({ ttlMs, max: 5000 }) : null,
    rateLimiter: createRateLimiter({ capacity: 30, refillPerSec: 0.2 }),
  };
}

async function buildVerifier({ redisClient }) {
  const verifiers = {};
  const enabled = [];

  if (process.env.APPLE_BUNDLE_ID) {
    try {
      // 지문은 env로 직접 받거나, PEM이 있으면 부팅 시 한 번 계산한다.
      let fp = process.env.APPLE_ROOT_CERT_FINGERPRINT_SHA256;
      if (!fp && process.env.APPLE_ROOT_CERT_PEM) {
        const { X509Certificate } = await import('node:crypto');
        fp = new X509Certificate(process.env.APPLE_ROOT_CERT_PEM).fingerprint256;
      }
      const { createAppleVerifier } = await import('./verifiers/apple.mjs');
      verifiers.iap_apple = await createAppleVerifier({
        bundleId: process.env.APPLE_BUNDLE_ID,
        productIds: (process.env.APPLE_PRODUCT_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        rootCertFingerprint: fp,
      });
      enabled.push('iap_apple');
    } catch (e) {
      console.warn('[verify] Apple 검증기 비활성화:', e.message);
    }
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      verifiers.iap_google = createGoogleVerifier({
        serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        packageName: process.env.GOOGLE_PACKAGE_NAME,
        productIds: (process.env.GOOGLE_PRODUCT_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      });
      enabled.push('iap_google');
    } catch (e) {
      console.warn('[verify] Google 검증기 비활성화:', e.message);
    }
  }

  if (process.env.AD_CALLBACK_SECRET) {
    try {
      verifiers.rewarded_ad = createRewardedAdVerifier({ secret: process.env.AD_CALLBACK_SECRET });
      enabled.push('rewarded_ad');
    } catch (e) {
      console.warn('[verify] 광고 검증기 비활성화:', e.message);
    }
  }

  if (enabled.length === 0) return { verifyProof: null, enabled };

  const replayStore = redisClient
    ? createRedisReplayStore({ client: redisClient })
    : createInMemoryReplayStore();

  return { verifyProof: createVerifier({ verifiers, replayStore }), enabled };
}

const storage = await buildStorage();
const { verifyProof, enabled: enabledVerifiers } = await buildVerifier({ redisClient: storage.client });
const llmInfo = describeProvider();
const HMAC_CONFIGURED = !!process.env.PRIVACY_HMAC_SECRET;
console.log(`[storage] mode=${storage.mode}  cache=${CACHE_ENABLED ? `${CACHE_TTL_SEC}s` : 'disabled'}`);
console.log(`[verify] enabled=${enabledVerifiers.join(',') || '(none — /unlock 501)'}`);
console.log(`[llm] provider=${llmInfo.provider} nodeEnv=${llmInfo.nodeEnv} — ${llmInfo.note}`);
console.log(`[privacy] hmac=${HMAC_CONFIGURED ? 'configured' : 'FALLBACK(SHA-256)'}  cacheTtl=${CACHE_TTL_SEC}s`);

const handler = createFortuneHandler({
  llm: await pickFortuneLlm(),
  cache: storage.cache,
  rateLimiter: storage.rateLimiter,
});

const app = new Hono();

// TODO(보안): '*' 대신 토스 웹뷰 오리진으로 제한.
app.use('/api/*', cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));

app.get('/health', (c) =>
  c.json({
    ok: true,
    storage: storage.mode,
    verifiers: enabledVerifiers,
    promptVersion: PROMPT_VERSION,
    llm: llmInfo,
    // CLI 모드에선 토큰/비용 텔레메트리가 없어 0으로 두면 운영자가 "API 안 도네?" 오해 가능.
    // 명시적으로 비활성 신호를 보내고, API 모드에서만 실제 사용량 노출.
    usage:
      llmInfo.provider === 'cli'
        ? { available: false, reason: 'cli-mode-no-telemetry' }
        : globalUsageTracker.summary(),
  }),
);

function clientIp(c) {
  // 우선순위: Vercel 신뢰 헤더 > x-real-ip > 일반 x-forwarded-for.
  // 임의 위조 가능한 x-forwarded-for를 마지막 폴백으로만 사용 — 운영 IP 신뢰성 ↑.
  const trusted = c.req.header('x-vercel-forwarded-for');
  if (trusted) return trusted.split(',')[0].trim();
  const real = c.req.header('x-real-ip');
  if (real) return real.trim();
  const xff = c.req.header('x-forwarded-for');
  return xff ? xff.split(',')[0].trim() : 'anon';
}

app.post('/api/fortune', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { status, body: res } = await handler.getFortune({ body, ip: clientIp(c) });
  return c.json(res, status);
});

app.post('/api/fortune/unlock', async (c) => {
  const body = await c.req.json().catch(() => null);
  const { status, body: res } = await handler.unlock({ body, verifyProof });
  return c.json(res, status);
});

// 프라이버시 정책 기계가독 endpoint — 클라이언트 UI/심사 도구가 정책을 신뢰 가능한 형태로 받아간다.
// 코드와 운영 env가 정의하는 사실만 노출. 마케팅 문구 아님.
app.get('/api/privacy', (c) =>
  c.json({
    policyVersion: '2026-05-29',
    storage: {
      database: 'none',
      identifiersInStore: 'hashed', // HMAC-SHA256 (시크릿 설정 시) 또는 SHA-256
      hashSecretConfigured: HMAC_CONFIGURED,
    },
    retention: {
      cacheEnabled: CACHE_ENABLED,
      cacheTtlSec: CACHE_TTL_SEC,
      rateLimitWindowSec: 60,
      replayStoreSec: 30 * 24 * 60 * 60,
    },
    inputs: {
      birthProfile: '요청 1회 처리 후 평문은 메모리에서 폐기. 캐시 키는 해시(캐시 활성 시).',
      ip: '레이트리밋용 해시 키로만 보관. raw IP 저장 안 함.',
      receipt: '리플레이 방어 set membership 용도 해시. 원문 미보관.',
    },
    sideChannels: CACHE_ENABLED
      ? {
          cacheTiming:
            '캐시 활성 — 동일 입력 재요청 시 응답시간 차이로 캐시 적중 추정 가능. ' +
            '완전 휘발을 원하면 FORTUNE_CACHE_TTL_SEC=0 설정.',
        }
      : { cacheTiming: '캐시 비활성 — 모든 요청 동일 latency 분포.' },
    thirdParty: {
      llm: 'Anthropic API — 콘텐츠는 Anthropic 보존 정책 적용. 운영자가 ZDR 등 추가 계약을 별도 체결해야 보존이 단축됨(기본 적용 아님).',
      iap: 'Apple/Google 영수증 검증을 위해 영수증 페이로드를 해당 서버로 전송 (검증 후 응답만 사용).',
    },
    userAccounts: 'none',
    requestLogging: 'request body 기록 안 함. provider/storage 모드 등 비식별 메타만.',
  }),
);

export default app;
