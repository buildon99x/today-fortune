// 햅틱 결정 로직(순수). 어떤 이벤트가 어떤 햅틱을 부르는지의 매핑만 담고,
// 실제 진동 호출(RN/SDK)은 createHaptics에 trigger로 주입 — §7.B 로직/효과 분리.

export const HAPTIC = {
  SUCCESS: 'success',
  ERROR: 'error',
  TAP: 'tap',
  SELECTION: 'selection',
};

const EVENT_MAP = {
  submit: HAPTIC.TAP,
  'cta-press': HAPTIC.TAP,
  share: HAPTIC.TAP,
  'chip-select': HAPTIC.SELECTION,
  'unlock-success': HAPTIC.SUCCESS,
  'unlock-error': HAPTIC.ERROR,
  'fetch-error': HAPTIC.ERROR,
};

/** 도메인 이벤트 → HAPTIC 값 또는 null(무진동). */
export function hapticForEvent(event) {
  return EVENT_MAP[event] ?? null;
}

/**
 * @param {{ trigger: (intent: string) => void }} deps
 * @returns {{ fire: (event: string) => void }}
 */
export function createHaptics({ trigger }) {
  return {
    fire(event) {
      const intent = hapticForEvent(event);
      if (intent) trigger(intent);
    },
  };
}
