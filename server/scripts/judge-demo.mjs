// 사용:
//   node scripts/judge-demo.mjs < fortune.json       # 운세 result JSON을 stdin으로
//   echo '{"headline":"...","sections":[...]}' | node scripts/judge-demo.mjs
//
// LLM 어댑터는 llm-router가 자동 선택(LLM_PROVIDER=cli|api). dev에선 claude -p,
// 운영에선 Anthropic SDK. 명시적 강제는 LLM_PROVIDER=cli 환경변수.

import { createJudge } from '../src/eval/judge.mjs';
import { pickJudgeLlm } from '../src/llm-router.mjs';

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const raw = await readStdin();
if (!raw.trim()) {
  console.error('stdin으로 운세 result JSON을 넘겨주세요.');
  process.exit(1);
}
const result = JSON.parse(raw);

const judge = createJudge({ llm: await pickJudgeLlm() });

const t0 = Date.now();
const out = await judge.evaluate(result);
console.log(JSON.stringify({ ...out, durationMs: Date.now() - t0 }, null, 2));
