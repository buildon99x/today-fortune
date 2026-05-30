// 순수 포매팅 헬퍼 — ResultScreen 인라인에서 추출해 테스트 가능하게 분리.

import { createLookup } from './i18n/index.mjs';

const lookup = createLookup();

/** 'YYYY-MM-DD' → 'YYYY.MM.DD'(한국어 UI 관습·동일 너비). 비매칭은 그대로. */
export function formatDate(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.replace(/-/g, '.') : iso;
}

/** 운세 타입 → 화면 라벨. 미지 타입은 빈 문자열(무throw). */
export function labelForType(type) {
  const labels = lookup('result.typeLabels') ?? {};
  return labels[type] ?? '';
}
