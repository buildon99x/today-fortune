import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCrossValidator, aggregateDivergence } from '../src/eval/cross-validator.mjs';

function fakeJudge(scores, notes = '') {
  return {
    async evaluate() {
      const total = Object.values(scores).reduce((a, b) => a + b, 0);
      return { scores, total, notes, judgeVersion: 'fake' };
    },
  };
}

const HIGH = { felt_comfort: 5, internal_locus: 5, barnum_balance: 5, hypothetical_tone: 5, permission_voice: 5 };
const MID = { felt_comfort: 4, internal_locus: 4, barnum_balance: 4, hypothetical_tone: 4, permission_voice: 4 };
const LOW = { felt_comfort: 2, internal_locus: 2, barnum_balance: 2, hypothetical_tone: 2, permission_voice: 2 };

test('factory rejects missing primary or secondary', () => {
  assert.throws(() => createCrossValidator({}), /primary/);
  assert.throws(() => createCrossValidator({ primary: fakeJudge(HIGH) }), /secondary/);
});

test('evaluate runs both judges and returns both results', async () => {
  const cv = createCrossValidator({ primary: fakeJudge(HIGH, 'p'), secondary: fakeJudge(MID, 's') });
  const r = await cv.evaluate({ headline: 'x', sections: [] });
  assert.equal(r.primary.notes, 'p');
  assert.equal(r.secondary.notes, 's');
  assert.equal(r.primary.total, 25);
  assert.equal(r.secondary.total, 20);
});

test('divergence — identical scores → all zeros, agree=true', async () => {
  const cv = createCrossValidator({ primary: fakeJudge(HIGH), secondary: fakeJudge(HIGH) });
  const r = await cv.evaluate({});
  assert.equal(r.divergence.maxAxisDiff, 0);
  assert.equal(r.divergence.sumAxisDiff, 0);
  assert.equal(r.divergence.totalDiff, 0);
  assert.equal(r.divergence.agree, true);
});

test('divergence — diff per axis computed correctly', async () => {
  const cv = createCrossValidator({ primary: fakeJudge(HIGH), secondary: fakeJudge(MID) });
  const r = await cv.evaluate({});
  // HIGH=5 vs MID=4 per axis → 1 each
  for (const ax of Object.keys(HIGH)) assert.equal(r.divergence.byAxis[ax], 1);
  assert.equal(r.divergence.maxAxisDiff, 1);
  assert.equal(r.divergence.sumAxisDiff, 5);
  assert.equal(r.divergence.totalDiff, 5);
  assert.equal(r.divergence.agree, true); // 1 <= threshold=1
});

test('divergence — exceeds threshold → agree=false', async () => {
  const cv = createCrossValidator({ primary: fakeJudge(HIGH), secondary: fakeJudge(LOW), threshold: 1 });
  const r = await cv.evaluate({});
  assert.equal(r.divergence.maxAxisDiff, 3); // 5-2=3
  assert.equal(r.divergence.agree, false);
});

test('custom threshold widens tolerance', async () => {
  const cv = createCrossValidator({ primary: fakeJudge(HIGH), secondary: fakeJudge(LOW), threshold: 3 });
  const r = await cv.evaluate({});
  assert.equal(r.divergence.agree, true); // 3 <= threshold=3
});

test('judges run in parallel (not sequential)', async () => {
  let order = [];
  const slow = {
    async evaluate() {
      order.push('slow-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('slow-end');
      return { scores: HIGH, total: 25, notes: '', judgeVersion: 'x' };
    },
  };
  const fast = {
    async evaluate() {
      order.push('fast-start');
      return { scores: HIGH, total: 25, notes: '', judgeVersion: 'x' };
    },
  };
  const cv = createCrossValidator({ primary: slow, secondary: fast });
  await cv.evaluate({});
  // Both started before slow finished — Promise.all
  assert.deepEqual(order.slice(0, 2).sort(), ['fast-start', 'slow-start']);
  assert.equal(order[order.length - 1], 'slow-end');
});

// === aggregateDivergence ===

test('aggregateDivergence computes agree rate and stats', () => {
  const rs = [
    { divergence: { agree: true, maxAxisDiff: 1, totalDiff: 2 } },
    { divergence: { agree: true, maxAxisDiff: 0, totalDiff: 0 } },
    { divergence: { agree: false, maxAxisDiff: 3, totalDiff: 7 } },
    { divergence: { agree: true, maxAxisDiff: 1, totalDiff: 1 } },
  ];
  const agg = aggregateDivergence(rs);
  assert.equal(agg.n, 4);
  assert.equal(agg.agreeRate, 0.75);
  assert.equal(agg.maxAxisDiff.max, 3);
  assert.equal(agg.maxAxisDiff.mean, (1 + 0 + 3 + 1) / 4);
  assert.equal(agg.totalDiff.max, 7);
  assert.equal(agg.totalDiff.mean, (2 + 0 + 7 + 1) / 4);
});

test('aggregateDivergence rejects empty input', () => {
  assert.throws(() => aggregateDivergence([]), /비어/);
  assert.throws(() => aggregateDivergence(null), /비어/);
});
