import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator, createLookup, SUPPORTED_LOCALES } from '../i18n/index.mjs';
import { ko } from '../i18n/strings.ko.mjs';

const t = createTranslator();

test('정확 문자열 보존(톤 회귀 가드)', () => {
  assert.equal(t('home.cta'), '운세 보기');
  assert.equal(t('common.backToInput'), '다시 입력하기');
  assert.equal(t('errors.rateLimited'), '지금은 많은 분이 같은 흐름을 찾고 있어요. 잠시 후 다시 닿아볼게요.');
});

test('dot-path 깊은 조회 + {var} 보간', () => {
  assert.equal(t('home.types.daily.label'), '오늘의 운세');
  const tv = createTranslator({ table: { greet: '안녕 {name}님' } });
  assert.equal(tv('greet', { name: '손님' }), '안녕 손님님');
});

test('누락 키는 키 그대로 반환(무throw)', () => {
  assert.equal(t('does.not.exist'), 'does.not.exist');
});

test('createLookup으로 배열/객체 노드 추출', () => {
  const lookup = createLookup();
  const msgs = lookup('result.loadMessages');
  assert.ok(Array.isArray(msgs) && msgs.length === 4);
});

test('지원 로케일 + 빈 문자열 sweep', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['ko']);
  const walk = (node) => {
    if (typeof node === 'string') return assert.ok(node.length > 0, '빈 문자열 금지');
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') return Object.values(node).forEach(walk);
  };
  walk(ko);
});
