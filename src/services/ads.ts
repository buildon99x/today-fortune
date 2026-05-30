// 앱인토스 광고 SDK 래퍼.
// 실제 호출 API는 개발자센터 광고 문서 기준으로 연결하세요:
//   https://developers-apps-in-toss.toss.im/ads/intro.html
// 광고 매출은 토스가 채워주고 파트너에게 정산(현재 별도 수수료 0, 향후 정책 예정).
//
// 이 스텁은 광고 통합의 단일 seam이다. 소비처: src/screens/ResultScreen.tsx(보상형 → unlockFortune).
// 실 SDK 연동 시 아래 본문만 교체하면 해제 UX(로딩/취소/에러)는 그대로 동작한다.
// TODO(검증): @apps-in-toss/framework 의 실제 광고 API로 아래 본문을 교체.

/** 운세 결과를 보여주기 직전 1회 노출. 가장 빠른 수익화 지점. */
export async function showInterstitial(): Promise<void> {
  // TODO: framework 전면광고 API 호출
}

/**
 * 보상형 광고. 시청 완료 시 서버 검증용 token을 반환한다.
 * 이 token을 백엔드 /api/fortune/unlock 에 넘겨 프리미엄을 해제한다.
 */
export async function showRewarded(): Promise<{ rewarded: boolean; token?: string }> {
  // TODO: framework 보상형 광고 API 호출 후 검증 토큰 획득
  return { rewarded: false };
}
