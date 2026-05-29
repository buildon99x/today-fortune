// 배치 평가 CLI — 같은 입력으로 N개 fortune 생성 → judge로 채점 → 분포 통계.
// 프롬프트 안정성 검증("매번 비슷한 품질 나오는가?")용.
//
// 사용:
//   node scripts/batch-eval.mjs [N] [--csv]
//   기본 N=5, 동시 호출 N (작게 잡기 권장 — claude -p는 비싸고 느림).
//
// 출력: 각 회차의 점수 + 축별 mean/min/max/stdev 요약.
// --csv 플래그: 헤더 + N행 CSV를 stdout으로(추가 분석/스프레드시트용).
//
// LLM 어댑터는 llm-router가 자동 선택(LLM_PROVIDER=cli|api). CLI 모드는 느림(25-60s/회),
// 동시 호출 N≥3 시 Claude Code 계정 레이트리밋 가능. API + Haiku 권장.

import { buildFortunePrompt } from '../core/prompt.mjs';
import { parseFortuneResponse } from '../core/fortune.mjs';
import { AXES, createJudge } from '../src/eval/judge.mjs';
import { pickFortuneLlm, pickJudgeLlm } from '../src/llm-router.mjs';

const N = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 5;
const CSV = process.argv.includes('--csv');

const fortuneLlm = await pickFortuneLlm();
const judgeLlm = await pickJudgeLlm();
const judge = createJudge({ llm: judgeLlm });

const profile = { year: 1995, month: 7, day: 15, hour: null, gender: 'female', calendar: 'solar' };
const today = new Date().toISOString().slice(0, 10);
const prompt = buildFortunePrompt(profile, { type: 'daily', date: today });

async function runOnce(i) {
  const t0 = Date.now();
  const fortuneText = await fortuneLlm({ system: prompt.system, user: prompt.user });
  const fortune = parseFortuneResponse(fortuneText);
  const scored = await judge.evaluate(fortune);
  return { i, ms: Date.now() - t0, headline: fortune.headline, scores: scored.scores, total: scored.total };
}

function stats(xs) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  return { mean: Number(mean.toFixed(2)), min, max, stdev: Number(stdev.toFixed(2)) };
}

if (!CSV) console.error(`▶ ${N}회 fortune+judge 병렬 실행…`);
const t0 = Date.now();
const results = await Promise.all(Array.from({ length: N }, (_, i) => runOnce(i)));
const totalMs = Date.now() - t0;

if (CSV) {
  console.log(['i', 'ms', ...AXES, 'total', 'headline'].join(','));
  for (const r of results) {
    const row = [r.i, r.ms, ...AXES.map((a) => r.scores[a]), r.total, JSON.stringify(r.headline)];
    console.log(row.join(','));
  }
} else {
  console.log(`\n각 회차 (${totalMs}ms 합계)`);
  console.log('─'.repeat(60));
  for (const r of results) {
    console.log(`#${r.i}  total=${r.total}/25  ${r.ms}ms  "${r.headline}"`);
    console.log(`   ${AXES.map((a) => `${a.split('_')[0]}=${r.scores[a]}`).join(' ')}`);
  }
  console.log('─'.repeat(60));
  console.log('축별 분포 (mean / min / max / stdev)');
  for (const a of AXES) {
    const s = stats(results.map((r) => r.scores[a]));
    console.log(`  ${a.padEnd(22)} ${s.mean.toFixed(2)}  ${s.min}  ${s.max}  ±${s.stdev.toFixed(2)}`);
  }
  const totals = results.map((r) => r.total);
  const s = stats(totals);
  console.log(`  ${'TOTAL'.padEnd(22)} ${s.mean.toFixed(2)}  ${s.min}  ${s.max}  ±${s.stdev.toFixed(2)}`);
}
