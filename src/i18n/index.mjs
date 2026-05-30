// 경량 i18n — 외부 라이브러리 없이 dot-path 조회 + {var} 보간.
// 팩토리+DI(§7.A): 테이블/로케일을 주입받아 t(key, vars)를 반환.
// 누락 키는 키 문자열을 그대로 돌려줘(무throw) UI가 빈칸/크래시 나지 않게 한다.

import { ko } from './strings.ko.mjs';

export const SUPPORTED_LOCALES = ['ko'];

const TABLES = { ko };

function resolve(table, key) {
  let node = table;
  for (const seg of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[seg];
  }
  return node;
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/**
 * @param {{ table?: object, locale?: string, fallbackLocale?: string }} [opts]
 * @returns {(key: string, vars?: Record<string, unknown>) => string}
 */
export function createTranslator(opts = {}) {
  const { locale = 'ko', fallbackLocale = 'ko' } = opts;
  const table = opts.table ?? TABLES[locale] ?? TABLES[fallbackLocale];
  const fallback = TABLES[fallbackLocale];
  return function t(key, vars) {
    const hit = resolve(table, key);
    if (typeof hit === 'string') return interpolate(hit, vars);
    const fb = resolve(fallback, key);
    if (typeof fb === 'string') return interpolate(fb, vars);
    return key; // 최후 폴백: 키 그대로(무throw).
  };
}

/** 비문자 노드(배열·객체)를 그대로 꺼낸다 — loadMessages, types 맵 등. */
export function createLookup(opts = {}) {
  const { locale = 'ko' } = opts;
  const table = opts.table ?? TABLES[locale] ?? TABLES.ko;
  return (key) => resolve(table, key);
}
