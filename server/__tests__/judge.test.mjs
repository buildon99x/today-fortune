import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AXES, createJudge, formatForJudge, parseJudgeResponse } from '../src/eval/judge.mjs';

const sampleResult = {
  acknowledgement: '오늘 마음에 작은 결이 비치네요',
  headline: '고요한 하루',
  sections: [
    { title: '총운', body: '평온하실 거예요.' },
    { title: '관계운', body: '대화가 부드럽게 흐릅니다.' },
  ],
  luckyItems: { color: '하늘색', number: 7, direction: '북' },
  advice: '쉬어가도 충분해요.',
};

const goodScores = JSON.stringify({
  scores: {
    felt_comfort: 5,
    internal_locus: 4,
    barnum_balance: 4,
    hypothetical_tone: 5,
    permission_voice: 5,
  },
  notes: '톤이 따뜻하고 일관적임',
});

test('createJudge requires an llm function', () => {
  assert.throws(() => createJudge({}), /llm/);
});

test('formatForJudge includes acknowledgement, headline, sections, advice', () => {
  const txt = formatForJudge(sampleResult);
  assert.match(txt, /\[ACKNOWLEDGEMENT\]/);
  assert.match(txt, /오늘 마음에 작은 결/);
  assert.match(txt, /\[HEADLINE\]/);
  assert.match(txt, /고요한 하루/);
  assert.match(txt, /\[SECTIONS\]/);
  assert.match(txt, /총운: 평온/);
  assert.match(txt, /\[ADVICE\]/);
  assert.match(txt, /쉬어가도 충분해요/);
});

test('formatForJudge omits acknowledgement / advice when empty', () => {
  const r = { headline: 'X', sections: [{ title: 'A', body: 'B' }] };
  const txt = formatForJudge(r);
  assert.doesNotMatch(txt, /ACKNOWLEDGEMENT/);
  assert.doesNotMatch(txt, /ADVICE/);
});

test('parseJudgeResponse extracts scores and computes total', () => {
  const out = parseJudgeResponse(goodScores);
  assert.equal(out.scores.felt_comfort, 5);
  assert.equal(out.scores.internal_locus, 4);
  assert.equal(out.total, 5 + 4 + 4 + 5 + 5);
  assert.equal(out.notes, '톤이 따뜻하고 일관적임');
  assert.equal(typeof out.judgeVersion, 'string');
});

test('parseJudgeResponse tolerates surrounding prose', () => {
  const raw = `네 알겠습니다.\n${goodScores}\n끝.`;
  const out = parseJudgeResponse(raw);
  assert.equal(out.total, 23);
});

test('parseJudgeResponse rejects missing axis', () => {
  const bad = JSON.stringify({
    scores: {
      felt_comfort: 5,
      internal_locus: 4,
      barnum_balance: 4,
      hypothetical_tone: 5,
      // permission_voice 누락
    },
  });
  assert.throws(() => parseJudgeResponse(bad), /permission_voice/);
});

test('parseJudgeResponse rejects out-of-range score', () => {
  const bad = JSON.stringify({
    scores: {
      felt_comfort: 6,
      internal_locus: 4,
      barnum_balance: 4,
      hypothetical_tone: 5,
      permission_voice: 5,
    },
  });
  assert.throws(() => parseJudgeResponse(bad), /felt_comfort/);
});

test('parseJudgeResponse rejects non-integer score', () => {
  const bad = JSON.stringify({
    scores: {
      felt_comfort: 4.5,
      internal_locus: 4,
      barnum_balance: 4,
      hypothetical_tone: 5,
      permission_voice: 5,
    },
  });
  assert.throws(() => parseJudgeResponse(bad), /felt_comfort/);
});

test('parseJudgeResponse rejects malformed json', () => {
  assert.throws(() => parseJudgeResponse('not json at all'), /해석/);
});

test('evaluate wires llm with built prompt and returns parsed scores', async () => {
  let captured;
  const judge = createJudge({
    llm: async (p) => {
      captured = p;
      return goodScores;
    },
  });
  const out = await judge.evaluate(sampleResult);
  // Built prompt structure
  assert.match(captured.system, /채점자/);
  assert.match(captured.system, /felt_comfort/);
  assert.match(captured.user, /오늘 마음에 작은 결/);
  assert.match(captured.user, /고요한 하루/);
  // Parsed result
  assert.equal(out.scores.felt_comfort, 5);
  assert.equal(out.total, 23);
  // All axes present
  for (const ax of AXES) assert.ok(ax in out.scores);
});
