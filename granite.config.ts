// 앱인토스 빌드 설정.
// 정본(正本) 스키마는 `ait init`이 생성하는 granite.config.ts를 기준으로 하세요.
// 본 파일은 구조 참고용 — 실제 필드명/옵션은 개발자센터 문서로 검증 필요:
//   https://developers-apps-in-toss.toss.im/development/overview.html
//
// TODO(검증): appName/permissions/스플래시 등 실제 옵션을 `ait init` 산출물과 대조해 채울 것.

import { defineConfig } from '@apps-in-toss/framework';

export default defineConfig({
  appName: 'ai-fortune',
  // 비게임 RN 미니앱은 TDS(Toss Design System) 사용이 검수 필수.
  // 권한/네트워크 허용 도메인 등은 콘솔/문서 기준으로 추가.
});
