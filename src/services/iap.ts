// 인앱결제(IAP) 래퍼 — 프리미엄 상세 운세 잠금 해제.
// 애플/구글 수수료 30% 제외 후 70%가 파트너 정산(현재 토스 추가 수수료 0, 향후 정책 예정).
//
// 이 스텁은 결제 통합의 단일 seam이다. 소비처: src/monetization/unlockMachine.mjs(리듀서) +
// src/screens/ResultScreen.tsx. 실 SDK 연동 시 아래 본문만 교체하면 UX는 그대로 동작한다.
// TODO(검증): @apps-in-toss/framework 의 실제 결제 API로 아래 본문을 교체.

export const PRODUCTS = {
  fullReading: 'fortune.full_reading', // 단건: 상세 운세 1회 해제
  monthly: 'fortune.monthly', // 구독: 매일 상세 운세
} as const;

export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];

/**
 * 구매 플로우 실행. 성공 시 서버 검증용 receipt를 반환한다.
 * receipt는 백엔드 /api/fortune/unlock 으로 보내 서버에서 검증해야 한다(클라 신뢰 금지).
 */
export async function purchase(
  _productId: ProductId,
): Promise<{ purchased: boolean; receipt?: string }> {
  // TODO: framework 결제 API 호출 후 영수증 획득 (_productId로 상품 지정)
  return { purchased: false };
}

/** 이미 해제/구독 중인지 확인(앱 재진입 시 복원). */
export async function isUnlocked(_productId: ProductId): Promise<boolean> {
  // TODO: framework 구매 복원 API
  return false;
}

/**
 * 구매 복원. 복원 성공 시 서버 재검증용 receipt를 반환한다.
 * (실 SDK의 restorePurchases는 과거 영수증을 돌려주므로 unlock 흐름을 재사용할 수 있다.)
 */
export async function restorePurchase(
  _productId: ProductId,
): Promise<{ restored: boolean; receipt?: string }> {
  // TODO: framework 구매 복원 API 호출 후 영수증 획득
  return { restored: false };
}
