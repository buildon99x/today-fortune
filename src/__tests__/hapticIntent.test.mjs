import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HAPTIC, hapticForEvent, createHaptics } from '../feedback/hapticIntent.mjs';

test('이벤트 → 햅틱 intent 매핑', () => {
  assert.equal(hapticForEvent('submit'), HAPTIC.TAP);
  assert.equal(hapticForEvent('chip-select'), HAPTIC.SELECTION);
  assert.equal(hapticForEvent('unlock-success'), HAPTIC.SUCCESS);
  assert.equal(hapticForEvent('fetch-error'), HAPTIC.ERROR);
  assert.equal(hapticForEvent('nope'), null);
});

test('createHaptics: intent 있으면 trigger 호출, 없으면 무호출', () => {
  const calls = [];
  const h = createHaptics({ trigger: (i) => calls.push(i) });
  h.fire('unlock-success');
  h.fire('unknown-event');
  assert.deepEqual(calls, [HAPTIC.SUCCESS]);
});
