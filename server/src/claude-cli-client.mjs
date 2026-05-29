// 로컬 dev용 LLM 어댑터 — Anthropic API 대신 `claude -p` CLI를 호출.
// 같은 `({system,user}) => Promise<string>` 시그니처라 anthropic-client / anthropic-judge-client와
// 호환되며, llm-router.mjs가 LLM_PROVIDER env에 따라 자동 선택한다.
//
// 한계 (반드시 인지할 것):
//   1. 모델이 다름 — CLI는 Claude Code의 기본 모델(보통 Opus 계열)을 사용. prod의 Haiku와
//      품질 분포가 달라 프롬프트 튜닝이 prod에 그대로 이전되지 않을 수 있다.
//   2. 구조화 출력(output_config) 미사용 — 자유 텍스트 응답을 파서가 관용 처리.
//      JSON 외 문구 섞일 가능성 있음. parseFortuneResponse / parseJudgeResponse는 이를 견딘다.
//   3. prompt caching 미지원 — 매번 풀 비용.
//   4. usage 미보고 — globalUsageTracker는 dev에서 0으로 유지.
//   5. 느림 — 호출당 25-40초.
//
// 위 한계 때문에 prod 사용은 금지(llm-router에서 NODE_ENV=production + LLM_PROVIDER=cli 거부).
// 진지한 프롬프트 튜닝은 prod와 같은 모델(Haiku)로 API에서 하는 것을 권장한다.

import { spawn } from 'node:child_process';

const TIMEOUT_MS = Number(process.env.CLAUDE_CLI_TIMEOUT_MS) || 90_000;
const TAIL = '\n\n반드시 JSON 객체 하나만 출력하세요. 다른 설명·코드블록·마크다운 금지.';

/**
 * `claude -p <prompt>` 를 실행하고 stdout을 반환.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function callClaudeCli(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`claude -p timeout after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI 실행 실패 — 설치/로그인 여부 확인: ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude -p exit ${code}: ${stderr.trim() || '(no stderr)'}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/** 운세 생성용 어댑터. anthropicLlm과 동일 시그니처. */
export async function claudeCliFortuneLlm({ system, user }) {
  return callClaudeCli(`${system}\n\n---\n\n${user}${TAIL}`);
}

/** judge 채점용 어댑터. anthropicJudgeLlm과 동일 시그니처. */
export async function claudeCliJudgeLlm({ system, user }) {
  return callClaudeCli(`${system}\n\n---\n\n${user}${TAIL}`);
}
