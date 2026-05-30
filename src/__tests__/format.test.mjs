import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, labelForType } from '../format.mjs';

test('formatDate: ISO → 점 표기, 비매칭은 그대로', () => {
  assert.equal(formatDate('2026-05-30'), '2026.05.30');
  assert.equal(formatDate('2026/05/30'), '2026/05/30');
  assert.equal(formatDate(''), '');
});

test('labelForType: 알려진 타입 라벨, 미지 타입은 빈 문자열', () => {
  assert.equal(labelForType('daily'), '오늘의 운세');
  assert.equal(labelForType('wealth'), '재물운');
  assert.equal(labelForType('unknown'), '');
});
