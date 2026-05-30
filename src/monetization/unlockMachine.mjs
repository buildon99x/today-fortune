// 프리미엄 해제 라이프사이클을 순수 리듀서로 모델링. 현재 ResultScreen의 조용한 return(피드백
// 없음) 버그를 제거하고 구매/복원/pending/취소/재시도 상태를 테스트 가능하게 만든다.
// IAP/광고 SDK 실호출은 .tsx 껍데기에서 일어나고, 결과를 action으로 dispatch한다.

import { createTranslator } from '../i18n/index.mjs';

const t = createTranslator();

export const UNLOCK_STATES = {
  IDLE: 'idle',
  PURCHASING: 'purchasing',
  ADVERTISING: 'advertising',
  RESTORING: 'restoring',
  PENDING: 'pending',
  UNLOCKED: 'unlocked',
  ERROR: 'error',
};

export const initialUnlockState = { status: UNLOCK_STATES.IDLE, message: null, premium: null };

/** @returns {{ status: string, message: string|null, premium: object|null }} */
export function unlockReducer(state, action) {
  switch (action.type) {
    case 'START_PURCHASE':
      return { status: UNLOCK_STATES.PURCHASING, message: t('result.purchasing'), premium: null };
    case 'START_AD':
      return { status: UNLOCK_STATES.ADVERTISING, message: t('result.advertising'), premium: null };
    case 'START_RESTORE':
      return { status: UNLOCK_STATES.RESTORING, message: t('result.restoring'), premium: null };
    case 'PROOF_CANCELLED':
      // 사용자가 결제/광고를 닫음 — 조용히 사라지지 않고 부드럽게 안내.
      return { status: UNLOCK_STATES.IDLE, message: t('result.cancelled'), premium: null };
    case 'RESTORE_EMPTY':
      // 복원할 구매가 없음 — "취소"가 아니므로 복원 전용 중립 안내.
      return { status: UNLOCK_STATES.IDLE, message: t('result.restoreNone'), premium: null };
    case 'UNLOCK_SUCCESS':
      return { status: UNLOCK_STATES.UNLOCKED, message: null, premium: action.premium };
    case 'SERVER_PENDING':
      return {
        status: UNLOCK_STATES.PENDING,
        message: t('errors.unlockNotReady'),
        premium: null,
      };
    case 'UNLOCK_ERROR':
      return {
        status: UNLOCK_STATES.ERROR,
        message: action.message || t('errors.unlockFallback'),
        premium: null,
      };
    case 'RETRY':
      return initialUnlockState;
    default:
      return state;
  }
}

/** 재시도 버튼을 보일지. */
export function canRetry(state) {
  return state.status === UNLOCK_STATES.ERROR;
}
