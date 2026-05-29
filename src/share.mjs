// 공유 메시지 빌더. 200자 한도는 SMS 분할 방지.

const TAIL = '— AI 운세';

/**
 * @param {{acknowledgement?: string, headline?: string}} f
 * @returns {string}
 */
export function buildShareMessage(f) {
  const ack = (f?.acknowledgement ?? '').trim();
  const headline = (f?.headline ?? '').trim();
  const firstSentence = ack ? ack.split(/(?<=[.!?])\s/)[0].slice(0, 60) : '';
  const msg = [firstSentence, headline, TAIL].filter(Boolean).join('\n');
  if (msg.length <= 200) return msg;
  // 우선순위: headline + tail 유지, ack 잘라냄.
  return `${headline}\n${TAIL}`.slice(0, 200);
}
