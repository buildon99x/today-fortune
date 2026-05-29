// LLM 제공자 라우터 — env로 dev(CLI) ↔ prod(API) 전환.
//
// 환경변수:
//   LLM_PROVIDER = 'api' (기본) | 'cli'
//   NODE_ENV     = 'production' 이면 'cli'를 거부 (부팅 시 throw)
//
// 사용 (ESM top-level await):
//   import { pickFortuneLlm, pickJudgeLlm } from './llm-router.mjs';
//   const handler = createFortuneHandler({ llm: await pickFortuneLlm(), ... });
//
// 왜 lazy 로드인가:
//   - CLI 모드 dev에선 @anthropic-ai/sdk를 설치할 필요 없게 한다.
//   - api 모드에선 CLI 어댑터(child_process spawn 헬퍼) 로드를 피한다.
//   - 잘못된 mode를 골랐을 때 누락된 의존성에 대한 에러를 부팅 시점에 정확한 출처로 던진다.

const VALID_PROVIDERS = new Set(['api', 'cli']);

function resolveProvider() {
  const raw = (process.env.LLM_PROVIDER ?? 'api').toLowerCase();
  if (!VALID_PROVIDERS.has(raw)) {
    throw new Error(
      `LLM_PROVIDER 값이 올바르지 않습니다: ${JSON.stringify(process.env.LLM_PROVIDER)}. ` +
        `허용값: ${[...VALID_PROVIDERS].join(', ')}`,
    );
  }
  if (raw === 'cli' && process.env.NODE_ENV === 'production') {
    throw new Error(
      'LLM_PROVIDER=cli 는 운영(NODE_ENV=production)에서 허용되지 않습니다. ' +
        'API(SDK) 어댑터를 사용하세요.',
    );
  }
  return raw;
}

/** 운세 생성 LLM 선택. */
export async function pickFortuneLlm() {
  if (resolveProvider() === 'cli') {
    const { claudeCliFortuneLlm } = await import('./claude-cli-client.mjs');
    return claudeCliFortuneLlm;
  }
  const { anthropicLlm } = await import('./anthropic-client.mjs');
  return anthropicLlm;
}

/** judge 채점 LLM 선택. */
export async function pickJudgeLlm() {
  if (resolveProvider() === 'cli') {
    const { claudeCliJudgeLlm } = await import('./claude-cli-client.mjs');
    return claudeCliJudgeLlm;
  }
  const { anthropicJudgeLlm } = await import('./eval/anthropic-judge-client.mjs');
  return anthropicJudgeLlm;
}

/** 활성 provider 상세 — /health 로깅용. 동기, 의존성 로드 없음. */
export function describeProvider() {
  const provider = resolveProvider();
  return {
    provider,
    nodeEnv: process.env.NODE_ENV ?? '(unset)',
    note:
      provider === 'cli'
        ? 'local claude -p — 느림/비캐시/사용량 미보고. dev 전용.'
        : `Anthropic SDK — model=${process.env.FORTUNE_MODEL ?? 'claude-haiku-4-5'}.`,
  };
}
