// 운세 백엔드 API 클라이언트.
// 클라이언트는 생년월일 프로필만 전송한다 — 프롬프트는 서버가 만든다(LLM 무단 사용 방지).
// 서버는 무료 부분만 반환한다. 프리미엄 상세는 서버에만 있고, 해제는 영수증 검증을 거친다.
// fetch는 타임아웃/재시도/Abort를 감싼 resilient 버전을 주입한다(테스트는 fake request 주입).

import { createResilientFetch, DEFAULT_FORTUNE_POLICY } from './fetchPolicy.mjs';
import { fortuneErrorFor, unlockErrorFor } from './errorCatalog.mjs';

const BASE = process.env.FORTUNE_BACKEND_URL ?? 'https://your-backend.example.com';

type RequestFn = (url: string, options?: RequestInit) => Promise<Response>;

const defaultRequest: RequestFn = createResilientFetch({
  fetch: (url: string, options?: RequestInit) => fetch(url, options),
  AbortController,
  setTimeout,
  clearTimeout,
  policy: DEFAULT_FORTUNE_POLICY,
});

export type FortuneType = 'daily' | 'saju' | 'love' | 'wealth';

/** 프리미엄 행운 아이템(서버 계약). 모든 필드 선택적. */
export type LuckyItemsData = { color?: string; number?: number; direction?: string };

export type FreeFortune = {
  acknowledgement: string;
  headline: string;
  sections: { title: string; body: string }[];
  locked: boolean;
  meta: { type: FortuneType; date: string };
};

export type FortuneRequest = {
  year: number;
  month: number;
  day: number;
  gender: 'male' | 'female' | 'unspecified';
  type: FortuneType;
};

function toBody(input: FortuneRequest) {
  return {
    profile: { year: input.year, month: input.month, day: input.day, gender: input.gender },
    options: { type: input.type },
  };
}

/** 무료 운세를 가져온다. request를 주입하면 테스트에서 네트워크 없이 검증 가능. */
export async function fetchFortune(
  input: FortuneRequest,
  deps: { request?: RequestFn } = {},
): Promise<FreeFortune> {
  const request = deps.request ?? defaultRequest;
  const res = await request(`${BASE}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBody(input)),
  });
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    throw new Error(fortuneErrorFor(400, data?.error));
  }
  if (!res.ok) throw new Error(fortuneErrorFor(res.status));
  return res.json();
}

/**
 * 프리미엄 상세 운세를 해제한다. proof는 IAP 영수증 또는 보상형 광고 토큰.
 * 서버의 영수증 검증이 구현되기 전까지 501을 반환하므로 호출 측에서 처리한다.
 */
export async function unlockFortune(
  input: FortuneRequest,
  proof: { type: 'iap'; receipt: string } | { type: 'rewarded_ad'; token: string },
  deps: { request?: RequestFn } = {},
): Promise<{
  sections: { title: string; body: string }[];
  advice: string;
  luckyItems: LuckyItemsData | null;
}> {
  const request = deps.request ?? defaultRequest;
  const res = await request(`${BASE}/api/fortune/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toBody(input), proof }),
  });
  if (!res.ok) {
    // HTTP status를 에러에 실어 보낸다 — 호출부가 문구 비교가 아닌 status로 분기(501→준비 중).
    const err = new Error(unlockErrorFor(res.status)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
