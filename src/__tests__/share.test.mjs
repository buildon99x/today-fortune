import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareMessage } from '../share.mjs';

test('headline만 있을 때 — ack 라인 없이 출력', () => {
  const msg = buildShareMessage({ headline: '조용한 흐름 속 당신의 중심' });
  assert.equal(msg, '조용한 흐름 속 당신의 중심\n— AI 운세');
});

test('ack + headline — 둘 다 포함', () => {
  const msg = buildShareMessage({
    acknowledgement: '오늘 마음에 잔잔한 결이 비치네요.',
    headline: '내면의 힘이 빛나는 날',
  });
  assert.match(msg, /오늘 마음에 잔잔한 결이 비치네요\./);
  assert.match(msg, /내면의 힘이 빛나는 날/);
  assert.match(msg, /— AI 운세/);
});

test('ack가 여러 문장이면 첫 문장만 사용', () => {
  const msg = buildShareMessage({
    acknowledgement: '오늘 마음에 두 갈래 결이 비치네요. 그 사이에 머물러도 괜찮아요.',
    headline: '천천히 피어나는 하루',
  });
  // 첫 문장만, 둘째 문장 제외
  assert.match(msg, /오늘 마음에 두 갈래 결이 비치네요\./);
  assert.equal(msg.includes('그 사이에 머물러도'), false);
});

test('200자 한도 초과 시 ack 잘라내고 headline + tail만 유지', () => {
  const longAck = '가'.repeat(180);
  const msg = buildShareMessage({
    acknowledgement: longAck,
    headline: '오늘은 좋은 날',
  });
  assert.ok(msg.length <= 200, `expected <=200, got ${msg.length}`);
  assert.match(msg, /오늘은 좋은 날/);
  assert.match(msg, /— AI 운세/);
  // 긴 ack는 잘려나감
  assert.equal(msg.includes(longAck), false);
});

test('빈/누락 입력 — 안전하게 동작', () => {
  assert.equal(buildShareMessage({}), '— AI 운세');
  assert.equal(buildShareMessage({ headline: '' }), '— AI 운세');
  assert.equal(buildShareMessage({ acknowledgement: '   ', headline: '오늘' }), '오늘\n— AI 운세');
});

test('ack가 첫 문장이지만 60자 초과 시 컷', () => {
  // 마침표가 없거나 매우 긴 첫 문장
  const longSentence =
    '오늘 하루는 매우 길고 복잡한 흐름이 비치는데 거기엔 평소와는 다른 새로운 어떤 결이 함께 들어있어요';
  const msg = buildShareMessage({
    acknowledgement: longSentence,
    headline: '오늘의 헤드라인',
  });
  // ack 자체가 60자 컷 후 들어감
  const ackLine = msg.split('\n')[0];
  assert.ok(ackLine.length <= 60, `expected ack line <=60, got ${ackLine.length}`);
});
