// 인앱결제(IAP) 래퍼 — 프리미엄 상세 운세 잠금 해제.
// 애플/구글 수수료 30% 제외 후 70%가 파트너 정산(현재 토스 추가 수수료 0, 향후 정책 예정).
//
// TODO(연결): @apps-in-toss/framework 의 결제 API로 아래 본문을 교체.
//   참고: https://developers-apps-in-toss.toss.im

import { NotImplementedError } from './errors';

export { NotImplementedError };

export const PRODUCTS = {
  fullReading: 'fortune.full_reading', // 단건: 상세 운세 1회 해제
  monthly: 'fortune.monthly', // 구독: 매일 상세 운세
} as const;

export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/**
 * 구매 플로우 실행. 성공 시 서버 검증용 receipt를 반환한다.
 *
 * **중요**: receipt를 클라이언트에서 신뢰하면 안 된다.
 * 반드시 서버 `/api/fortune/unlock` 엔드포인트로 전송해 서버에서 검증해야 한다.
 *
 * @throws {NotImplementedError} IAP SDK가 연결되지 않은 상태에서 호출 시
 */
export async function purchase(
  _productId: ProductId,
): Promise<{ purchased: boolean; receipt?: string }> {
  // TODO: framework 결제 API 호출 후 영수증 획득 (_productId로 상품 지정)
  throw new NotImplementedError('IAP SDK 미연결');
}

/** 이미 해제/구독 중인지 확인(앱 재진입 시 복원). SDK 미연결 시 false 반환(안전한 기본값). */
export async function isUnlocked(_productId: ProductId): Promise<boolean> {
  // TODO: framework 구매 복원 API
  return false;
}
