// 앱인토스 광고 SDK 래퍼.
// 실제 호출 API는 개발자센터 광고 문서 기준으로 연결하세요:
//   https://developers-apps-in-toss.toss.im/ads/intro.html
// 광고 매출은 토스가 채워주고 파트너에게 정산(현재 별도 수수료 0, 향후 정책 예정).
//
// TODO(연결): @apps-in-toss/framework 의 실제 광고 API로 아래 본문을 교체.

import { NotImplementedError } from './errors';

export { NotImplementedError };

/**
 * 운세 결과를 보여주기 직전 1회 노출. 가장 빠른 수익화 지점.
 *
 * 광고 실패가 운세 로드를 막으면 안 됨 — SDK 미연결 포함 모든 실패를 무시하고
 * 조용히 resolve한다. 호출부는 await 후 반드시 운세 표시를 이어가야 한다.
 */
export async function showInterstitial(): Promise<void> {
  // SDK 미연결 상태: 광고를 건너뛰고 운세 표시를 계속 진행한다.
  // TODO: framework 전면광고 API 호출 (실패 시에도 resolve 유지할 것)
}

/**
 * 보상형 광고. 시청 완료 시 서버 검증용 token을 반환한다.
 * 이 token을 백엔드 /api/fortune/unlock 에 넘겨 프리미엄을 해제한다.
 *
 * 보상형 광고는 잠금 해제 플로우의 전제 조건이므로 실패 시 반드시 에러를 던진다.
 * 호출부의 catch(e) 블록이 사용자에게 한국어 안내 메시지를 표시한다.
 *
 * @throws {NotImplementedError} 광고 SDK가 연결되지 않은 상태에서 호출 시
 */
export async function showRewarded(): Promise<{ rewarded: boolean; token?: string }> {
  // TODO: framework 보상형 광고 API 호출 후 검증 토큰 획득
  throw new NotImplementedError('광고 SDK 미연결');
}
