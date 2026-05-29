import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateBirthInput, isLeapYear, daysInMonth, firstBirthInputError } from '../validate.mjs';
import { buildFortunePrompt, TYPE_LABELS } from '../prompt.mjs';
import {
  createFortuneEngine,
  parseFortuneResponse,
  splitFreePremium,
} from '../fortune.mjs';

test('isLeapYear handles century rules', () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
});

test('validateBirthInput normalizes optional fields', () => {
  const out = validateBirthInput({ year: 1995, month: 7, day: 15 });
  assert.deepEqual(out, {
    year: 1995,
    month: 7,
    day: 15,
    hour: null,
    gender: 'unspecified',
    calendar: 'solar',
  });
});

test('validateBirthInput rejects Feb 29 on non-leap year', () => {
  assert.throws(() => validateBirthInput({ year: 2026, month: 2, day: 29 }), /2월/);
});

test('validateBirthInput accepts Feb 29 on leap year', () => {
  const out = validateBirthInput({ year: 2024, month: 2, day: 29 });
  assert.equal(out.day, 29);
});

test('validateBirthInput rejects out-of-range hour', () => {
  assert.throws(() => validateBirthInput({ year: 2000, month: 1, day: 1, hour: 24 }), /시/);
});

test('buildFortunePrompt embeds profile and enforces JSON schema', () => {
  const profile = validateBirthInput({ year: 1990, month: 3, day: 8, gender: 'female' });
  const { system, user, meta } = buildFortunePrompt(profile, { type: 'love', date: '2026-05-25' });
  assert.match(user, /1990년 3월 8일/);
  assert.match(user, /여성/);
  assert.match(user, new RegExp(TYPE_LABELS.love));
  assert.match(system, /JSON/);
  assert.equal(meta.type, 'love');
  assert.equal(meta.date, '2026-05-25');
});

test('buildFortunePrompt rejects unknown type', () => {
  const profile = validateBirthInput({ year: 1990, month: 3, day: 8 });
  assert.throws(() => buildFortunePrompt(profile, { type: 'tarot' }), /지원하지 않는/);
});

test('parseFortuneResponse tolerates surrounding prose', () => {
  const raw =
    '네 알겠습니다.\n{"headline":"좋은 날","sections":[{"title":"총운","body":"맑음"}],"advice":"미소"}\n끝';
  const r = parseFortuneResponse(raw);
  assert.equal(r.headline, '좋은 날');
  assert.equal(r.sections.length, 1);
  assert.equal(r.advice, '미소');
});

test('parseFortuneResponse throws on malformed output', () => {
  assert.throws(() => parseFortuneResponse('운세를 알 수 없습니다'), /해석/);
});

test('splitFreePremium locks everything past the first section', () => {
  const result = {
    acknowledgement: '오늘 마음에 작은 결이 비치네요',
    headline: 'H',
    sections: [
      { title: '총운', body: 'a' },
      { title: '관계운', body: 'b' },
      { title: '흐름', body: 'c' },
    ],
    luckyItems: { color: '청색', number: 7, direction: '동' },
    advice: '깊게 호흡하세요',
  };
  const { free, premium } = splitFreePremium(result);
  assert.equal(free.sections.length, 1);
  assert.equal(free.locked, true);
  assert.equal(free.acknowledgement, '오늘 마음에 작은 결이 비치네요');
  assert.equal(premium.sections.length, 2);
  assert.equal(premium.luckyItems.number, 7);
  // 프리미엄으로 새지 않아야 한다 — acknowledgement는 무료 전용 필드
  assert.equal(premium.acknowledgement, undefined);
});

test('parseFortuneResponse extracts acknowledgement when present', () => {
  const raw = JSON.stringify({
    acknowledgement: '오늘 마음이 한 박자 느려도 괜찮아요',
    headline: '고요한 하루',
    sections: [{ title: '총운', body: '평온' }],
    advice: '쉬어가도 충분해요',
  });
  const r = parseFortuneResponse(raw);
  assert.equal(r.acknowledgement, '오늘 마음이 한 박자 느려도 괜찮아요');
});

test('parseFortuneResponse defaults missing acknowledgement to empty string', () => {
  const raw = JSON.stringify({
    headline: '맑은 날',
    sections: [{ title: '총운', body: '쾌청' }],
    advice: '',
  });
  const r = parseFortuneResponse(raw);
  assert.equal(r.acknowledgement, '');
});

test('createFortuneEngine wires validation, prompt, llm, parsing', async () => {
  const calls = [];
  const fakeLlm = async (prompt) => {
    calls.push(prompt);
    return JSON.stringify({
      acknowledgement: '오늘 마음에 조용한 결이 비치네요',
      headline: '오늘은 기회의 날',
      sections: [
        { title: '총운', body: '전반적으로 안정적입니다.' },
        { title: '관계운', body: '대화가 술술 풀립니다.' },
        { title: '흐름과 변화', body: '작은 변화가 좋은 신호입니다.' },
      ],
      luckyItems: { color: '초록', number: 3, direction: '남' },
      advice: '서두르지 마세요.',
    });
  };
  const engine = createFortuneEngine({ llm: fakeLlm });
  const out = await engine.getFortune(
    { year: 1988, month: 12, day: 1, hour: 9, gender: 'male' },
    { type: 'daily', date: '2026-05-25' },
  );

  assert.equal(calls.length, 1);
  assert.match(calls[0].user, /1988년 12월 1일 9시/);
  assert.equal(out.result.sections.length, 3);
  assert.equal(out.result.acknowledgement, '오늘 마음에 조용한 결이 비치네요');
  assert.equal(out.free.acknowledgement, '오늘 마음에 조용한 결이 비치네요');
  assert.equal(out.free.locked, true);
  assert.equal(out.free.sections.length, 1);
  assert.equal(out.premium.sections.length, 2);
  assert.equal(out.meta.type, 'daily');
});

test('createFortuneEngine requires an llm function', () => {
  assert.throws(() => createFortuneEngine({}), /llm/);
});

test('engine propagates validation errors before calling llm', async () => {
  let called = false;
  const engine = createFortuneEngine({
    llm: async () => {
      called = true;
      return '{}';
    },
  });
  await assert.rejects(() => engine.getFortune({ year: 1800, month: 1, day: 1 }), /연도/);
  assert.equal(called, false);
});

test('daysInMonth handles leap February and 30-day months', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2026, 4), 30);
});

test('firstBirthInputError returns null for valid input', () => {
  assert.equal(firstBirthInputError({ year: 2000, month: 1, day: 1 }), null);
});

test('firstBirthInputError surfaces a Korean message without throwing', () => {
  const msg = firstBirthInputError({ year: 2026, month: 2, day: 30 });
  assert.equal(typeof msg, 'string');
  assert.match(msg, /2월/);
});

test('firstBirthInputError validates hour range', () => {
  assert.match(firstBirthInputError({ year: 2000, month: 1, day: 1, hour: 25 }), /시/);
  assert.equal(firstBirthInputError({ year: 2000, month: 1, day: 1, hour: 0 }), null);
});
