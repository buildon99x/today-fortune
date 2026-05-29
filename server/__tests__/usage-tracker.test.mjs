import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCostUsd, createUsageTracker } from '../src/usage-tracker.mjs';

test('computeCostUsd returns null for unknown model', () => {
  assert.equal(computeCostUsd('unknown-model', { input_tokens: 100 }), null);
  assert.equal(computeCostUsd('claude-haiku-4-5', null), null);
});

test('computeCostUsd applies Haiku pricing correctly', () => {
  // 1M input tokens at Haiku = $1.00, 1M output = $5.00 → total $6.00
  const cost = computeCostUsd('claude-haiku-4-5', {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
  });
  assert.equal(cost, 6.0);
});

test('computeCostUsd applies cache create/read multipliers', () => {
  // 1M cache create on Haiku = 1.0 * 1.25 = $1.25
  // 1M cache read on Haiku = 1.0 * 0.1 = $0.10
  const cost = computeCostUsd('claude-haiku-4-5', {
    cache_creation_input_tokens: 1_000_000,
    cache_read_input_tokens: 1_000_000,
  });
  assert.equal(cost, 1.35);
});

test('computeCostUsd Opus 4.7 pricing', () => {
  // 1M input * $5 = $5, 1M output * $25 = $25 → $30
  const cost = computeCostUsd('claude-opus-4-7', {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
  });
  assert.equal(cost, 30.0);
});

test('tracker accumulates totals and per-model buckets', () => {
  const t = createUsageTracker();
  t.record({ model: 'claude-haiku-4-5', usage: { input_tokens: 100, output_tokens: 50 } });
  t.record({ model: 'claude-haiku-4-5', usage: { input_tokens: 200, output_tokens: 80 } });
  t.record({ model: 'claude-opus-4-7', usage: { input_tokens: 50, output_tokens: 20 } });

  const s = t.summary();
  assert.equal(s.totalCalls, 3);
  assert.equal(s.tokens.input, 350);
  assert.equal(s.tokens.output, 150);
  assert.equal(s.byModel['claude-haiku-4-5'].calls, 2);
  assert.equal(s.byModel['claude-haiku-4-5'].input, 300);
  assert.equal(s.byModel['claude-opus-4-7'].calls, 1);
});

test('cacheHitRate computed correctly', () => {
  const t = createUsageTracker();
  // 100 fresh input + 200 cache create + 700 cache read = 1000 cacheable
  // cacheHitRate = 700/1000 = 0.7
  t.record({
    model: 'claude-haiku-4-5',
    usage: {
      input_tokens: 100,
      cache_creation_input_tokens: 200,
      cache_read_input_tokens: 700,
    },
  });
  assert.equal(t.summary().cacheHitRate, 0.7);
});

test('cacheHitRate is 0 when no cacheable tokens', () => {
  const t = createUsageTracker();
  assert.equal(t.summary().cacheHitRate, 0);
});

test('costUsd accumulates across records', () => {
  const t = createUsageTracker();
  t.record({ model: 'claude-haiku-4-5', usage: { input_tokens: 1_000_000 } });
  t.record({ model: 'claude-haiku-4-5', usage: { input_tokens: 1_000_000 } });
  // 2M Haiku input * $1/M = $2.00
  assert.equal(t.summary().estimatedCostUsd, 2.0);
});

test('record ignores missing model or usage', () => {
  const t = createUsageTracker();
  t.record({});
  t.record({ model: 'claude-haiku-4-5' });
  t.record({ usage: { input_tokens: 100 } });
  assert.equal(t.summary().totalCalls, 0);
});

test('record handles unknown model (no cost) but still counts tokens', () => {
  const t = createUsageTracker();
  t.record({ model: 'unknown-model', usage: { input_tokens: 500, output_tokens: 100 } });
  const s = t.summary();
  assert.equal(s.totalCalls, 1);
  assert.equal(s.tokens.input, 500);
  assert.equal(s.estimatedCostUsd, 0); // unknown model contributes 0 cost
});

test('reset clears all state', () => {
  const t = createUsageTracker();
  t.record({ model: 'claude-haiku-4-5', usage: { input_tokens: 100, output_tokens: 50 } });
  t.reset();
  const s = t.summary();
  assert.equal(s.totalCalls, 0);
  assert.equal(s.tokens.input, 0);
  assert.deepEqual(s.byModel, {});
});
