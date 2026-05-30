import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  unlockReducer,
  initialUnlockState,
  UNLOCK_STATES,
  canRetry,
} from '../monetization/unlockMachine.mjs';

test('해피패스: 구매 시작 → 성공이 premium을 싣는다', () => {
  let s = unlockReducer(initialUnlockState, { type: 'START_PURCHASE' });
  assert.equal(s.status, UNLOCK_STATES.PURCHASING);
  const premium = { sections: [], advice: 'a', luckyItems: null };
  s = unlockReducer(s, { type: 'UNLOCK_SUCCESS', premium });
  assert.equal(s.status, UNLOCK_STATES.UNLOCKED);
  assert.equal(s.premium, premium);
});

test('취소 → IDLE + 부드러운 안내(조용한 dead-end 방지)', () => {
  const s0 = unlockReducer(initialUnlockState, { type: 'START_AD' });
  const s = unlockReducer(s0, { type: 'PROOF_CANCELLED' });
  assert.equal(s.status, UNLOCK_STATES.IDLE);
  assert.ok(s.message && s.message.length > 0, '취소 시 침묵하지 않는다');
});

test('501 → PENDING(준비 중 카피)', () => {
  const s = unlockReducer(initialUnlockState, { type: 'SERVER_PENDING' });
  assert.equal(s.status, UNLOCK_STATES.PENDING);
  assert.match(s.message, /준비 중/);
});

test('에러 → 재시도 가능', () => {
  const s = unlockReducer(initialUnlockState, { type: 'UNLOCK_ERROR', message: '흐트러졌어요' });
  assert.equal(s.status, UNLOCK_STATES.ERROR);
  assert.equal(canRetry(s), true);
  assert.equal(canRetry(initialUnlockState), false);
});

test('복원 시작 → RESTORING', () => {
  const s = unlockReducer(initialUnlockState, { type: 'START_RESTORE' });
  assert.equal(s.status, UNLOCK_STATES.RESTORING);
});
