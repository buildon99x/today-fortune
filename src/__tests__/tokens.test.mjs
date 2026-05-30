import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lightPalette,
  darkPalette,
  spacing,
  radius,
  font,
  selectPalette,
} from '../theme/tokens.mjs';

test('light/dark 팔레트 키 패리티', () => {
  const lk = Object.keys(lightPalette).sort();
  const dk = Object.keys(darkPalette).sort();
  assert.deepEqual(dk, lk, '한 팔레트에만 있는 키가 없어야 한다');
});

test('selectPalette: dark만 다크, 그 외는 라이트', () => {
  assert.equal(selectPalette('dark'), darkPalette);
  assert.equal(selectPalette('light'), lightPalette);
  assert.equal(selectPalette(null), lightPalette);
  assert.equal(selectPalette(undefined), lightPalette);
  assert.equal(selectPalette('no-preference'), lightPalette);
});

test('스케일 값은 양수, pill은 충분히 큼', () => {
  for (const v of Object.values(spacing)) assert.ok(v > 0);
  for (const v of Object.values(radius)) assert.ok(v > 0);
  assert.ok(radius.pill >= 999);
  for (const v of Object.values(font.size)) assert.ok(v > 0);
});

test('라이트 브랜드 색은 기존 값 그대로(시각 회귀 가드)', () => {
  assert.equal(lightPalette.brand, '#3182f6');
  assert.equal(lightPalette.danger, '#f04452');
  assert.equal(lightPalette.border, '#dfe3e8');
});
