// LLM 제공자: Anthropic Claude. 엔진의 llm 계약 `({system,user}) => Promise<string>`을 구현.
// 제공자를 바꾸려면 같은 시그니처의 함수로 교체하면 된다(OpenAI/Gemini 등).
//
// 모델은 비용 우선으로 Haiku 기본, 환경변수로 교체 가능(예: FORTUNE_MODEL=claude-opus-4-7).

import Anthropic from '@anthropic-ai/sdk';
import { globalUsageTracker } from './usage-tracker.mjs';

const MODEL = process.env.FORTUNE_MODEL ?? 'claude-haiku-4-5';

// 구조화 출력 스키마 — 파서가 기대하는 운세 형태를 모델에 강제해 JSON 파싱 실패를 없앤다.
const FORTUNE_SCHEMA = {
  type: 'object',
  properties: {
    acknowledgement: { type: 'string' },
    headline: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, body: { type: 'string' } },
        required: ['title', 'body'],
        additionalProperties: false,
      },
    },
    luckyItems: {
      type: 'object',
      properties: {
        color: { type: 'string' },
        number: { type: 'integer' },
        direction: { type: 'string' },
      },
      required: ['color', 'number', 'direction'],
      additionalProperties: false,
    },
    advice: { type: 'string' },
  },
  required: ['acknowledgement', 'headline', 'sections', 'luckyItems', 'advice'],
  additionalProperties: false,
};

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }
    client = new Anthropic(); // ANTHROPIC_API_KEY 자동 사용
  }
  return client;
}

export async function anthropicLlm({ system, user }) {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    // 프롬프트 캐싱: 시스템 프롬프트가 모델 최소 캐시 프리픽스(Haiku 4.5 ~4096토큰)를 넘으면 캐시된다.
    // 현재 시스템 프롬프트는 짧아 실제 캐시는 거의 안 되며, 비용 절감의 핵심은 서버 응답 캐시(cache.mjs)다.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    // 구조화 출력으로 유효한 JSON 보장(파싱 실패 방지).
    output_config: { format: { type: 'json_schema', schema: FORTUNE_SCHEMA } },
  });
  globalUsageTracker.record({ model: MODEL, usage: res.usage });
  const block = res.content.find((b) => b.type === 'text');
  if (!block) throw new Error('LLM 빈 응답');
  return block.text;
}
