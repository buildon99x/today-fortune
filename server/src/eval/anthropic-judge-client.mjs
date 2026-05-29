// Anthropic SDK 기반 judge LLM 클라이언트.
// - 모델은 JUDGE_MODEL env로 교체 가능(기본 Sonnet 4.6).
//   * 채점 시스템 프롬프트가 ~3000자라 Sonnet 캐시 임계(2048)를 넘어 cache_read 0.1× 가격으로 작동.
//   * Haiku로 두면 캐시 임계(4096) 미달이라 매 호출 풀 비용 — 결과적으로 Sonnet이 반복 채점에서 더 싸고 빠름.
// - 구조화 출력으로 JSON 강제 → 파싱 실패 제거.

import Anthropic from '@anthropic-ai/sdk';
import { globalUsageTracker } from '../usage-tracker.mjs';

const MODEL = process.env.JUDGE_MODEL ?? 'claude-sonnet-4-6';

const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'object',
      properties: {
        felt_comfort: { type: 'integer' },
        internal_locus: { type: 'integer' },
        barnum_balance: { type: 'integer' },
        hypothetical_tone: { type: 'integer' },
        permission_voice: { type: 'integer' },
      },
      required: [
        'felt_comfort',
        'internal_locus',
        'barnum_balance',
        'hypothetical_tone',
        'permission_voice',
      ],
      additionalProperties: false,
    },
    notes: { type: 'string' },
  },
  required: ['scores', 'notes'],
  additionalProperties: false,
};

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }
    client = new Anthropic();
  }
  return client;
}

export async function anthropicJudgeLlm({ system, user }) {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    // 시스템 블록에 cache_control — 같은 system을 반복 호출하면 ~0.1× 가격으로 read.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { format: { type: 'json_schema', schema: JUDGE_SCHEMA } },
  });
  globalUsageTracker.record({ model: MODEL, usage: res.usage });
  const block = res.content.find((b) => b.type === 'text');
  if (!block) throw new Error('judge LLM 빈 응답');
  return block.text;
}
