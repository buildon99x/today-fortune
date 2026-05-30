import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fortuneErrorFor,
  unlockErrorFor,
  FALLBACK_LOAD_ERROR,
  FALLBACK_UNLOCK_ERROR,
} from '../services/errorCatalog.mjs';

test('fortuneErrorFor 상태 매핑', () => {
  assert.match(fortuneErrorFor(429), /많은 분/);
  assert.equal(fortuneErrorFor(400, '서버 메시지'), '서버 메시지');
  assert.match(fortuneErrorFor(400), /살펴봐 주실래요/);
  assert.equal(fortuneErrorFor(503), FALLBACK_LOAD_ERROR);
});

test('unlockErrorFor 상태 매핑', () => {
  assert.match(unlockErrorFor(501), /준비 중/);
  assert.equal(unlockErrorFor(500), FALLBACK_UNLOCK_ERROR);
});
