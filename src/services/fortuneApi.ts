// 운세 백엔드 API 클라이언트.
// 클라이언트는 생년월일 프로필만 전송한다 — 프롬프트는 서버가 만든다(LLM 무단 사용 방지).
// 서버는 무료 부분만 반환한다. 프리미엄 상세는 서버에만 있고, 해제는 영수증 검증을 거친다.

const BASE = process.env.FORTUNE_BACKEND_URL ?? 'https://your-backend.example.com';

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

/** 무료 운세를 가져온다. */
export async function fetchFortune(input: FortuneRequest): Promise<FreeFortune> {
  const res = await fetch(`${BASE}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBody(input)),
  });
  if (res.status === 429)
    throw new Error('지금은 많은 분이 같은 흐름을 찾고 있어요. 잠시 후 다시 닿아볼게요.');
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? '입력을 한 번만 더 살펴봐 주실래요?');
  }
  if (!res.ok) throw new Error('오늘의 흐름이 잠시 흐려졌어요. 조금 뒤에 다시 보여드릴게요.');
  return res.json();
}

/**
 * 프리미엄 상세 운세를 해제한다. proof는 IAP 영수증 또는 보상형 광고 토큰.
 * 서버의 영수증 검증이 구현되기 전까지 501을 반환하므로 호출 측에서 처리한다.
 */
export async function unlockFortune(
  input: FortuneRequest,
  proof: { type: 'iap'; receipt: string } | { type: 'rewarded_ad'; token: string },
): Promise<{
  sections: { title: string; body: string }[];
  advice: string;
  luckyItems: LuckyItemsData | null;
}> {
  const res = await fetch(`${BASE}/api/fortune/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toBody(input), proof }),
  });
  if (res.status === 501) throw new Error('전체 운세는 곧 열어드릴 수 있게 준비 중이에요.');
  if (!res.ok)
    throw new Error(
      '전체 운세를 펼치는 중에 흐름이 잠깐 흐트러졌어요. 다시 한 번 시도해 주실래요?',
    );
  return res.json();
}
