// 마지막 입력(생년월일+성별+유형) 영속화. 직렬화/검증은 순수, 저장 백엔드(AsyncStorage)는 주입.
// 프라이버시: App.state.input에 이미 있던 5필드만 저장 — 새 식별자 클래스 없음(§1.1은 서버 규칙),
// 디바이스ID 등 금지. 손상/구버전/변조 값은 null로 떨궈(무throw) 부팅을 막지 않는다.

import { firstBirthInputError, isValidGender, isValidType } from '../validation.mjs';

export const INPUT_STORAGE_KEY = 'today-fortune:lastInput:v1';

const ALLOWED_KEYS = ['year', 'month', 'day', 'gender', 'type'];

// 허용 키만 pick(spread 금지) — 단일 진실(ALLOWED_KEYS) 기반이라 추가 키가 새어나갈 수 없다.
export function serializeInput(input) {
  const out = {};
  for (const k of ALLOWED_KEYS) out[k] = input[k];
  return JSON.stringify(out);
}

/** 저장 문자열 → 유효한 BirthInput 또는 null. 절대 throw하지 않는다. */
export function parseStoredInput(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const { year, month, day, gender, type } = obj;
  if (firstBirthInputError({ year, month, day }) !== null) return null;
  if (!isValidGender(gender) || !isValidType(type)) return null;
  return { year, month, day, gender, type };
}

/**
 * @param {{ storage: { getItem: Function, setItem: Function, removeItem: Function }, key?: string }} deps
 */
export function createInputStore({ storage, key = INPUT_STORAGE_KEY }) {
  return {
    async load() {
      try {
        return parseStoredInput(await storage.getItem(key));
      } catch {
        return null; // 저장소 읽기 실패가 흐름을 막지 않게.
      }
    },
    async save(input) {
      await storage.setItem(key, serializeInput(input));
    },
    async clear() {
      await storage.removeItem(key);
    },
  };
}

export { ALLOWED_KEYS as _ALLOWED_KEYS };
