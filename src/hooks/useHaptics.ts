// 햅틱 훅 — 순수 결정 로직(hapticIntent.mjs)에 실제 진동 sink를 주입한다.
// @apps-in-toss SDK의 햅틱 API가 확정되면 trigger 본문만 교체하면 된다(통합 seam).

import { useMemo } from 'react';
import { Vibration } from 'react-native';
import { createHaptics, HAPTIC } from '../feedback/hapticIntent.mjs';

// 의도별 진동 패턴(ms). SDK 햅틱 연결 전까지 RN Vibration으로 최소 피드백.
const PATTERN: Record<string, number> = {
  [HAPTIC.SUCCESS]: 20,
  [HAPTIC.ERROR]: 40,
  [HAPTIC.TAP]: 10,
  [HAPTIC.SELECTION]: 10,
};

export function useHaptics() {
  return useMemo(
    () =>
      createHaptics({
        trigger: (intent: string) => {
          // TODO(검증): @apps-in-toss 햅틱 API로 교체. 현재는 RN Vibration 폴백.
          Vibration.vibrate(PATTERN[intent] ?? 10);
        },
      }),
    [],
  );
}
