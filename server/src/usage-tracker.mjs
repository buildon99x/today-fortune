// LLM 호출 토큰·캐시·비용 추적기.
// - createUsageTracker()로 격리된 인스턴스 생성(테스트용)
// - globalUsageTracker 싱글톤은 anthropic-client / anthropic-judge-client가 공유
// - /health에서 summary()로 노출 → 운영 모니터링·캐시 히트율·예상 비용 가시화
// - 인메모리 누적: 인스턴스/재배포 단위로 리셋. 장기 메트릭은 Prometheus 등으로 별도 출력 권장.

// 모델별 단가($ per 1M tokens) — Claude API 공식 기준.
// cacheCreate/cacheRead는 input 가격 대비 곱계수(5분 TTL).
const PRICING = {
  'claude-haiku-4-5': { in: 1.0, out: 5.0, cacheCreateMul: 1.25, cacheReadMul: 0.1 },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0, cacheCreateMul: 1.25, cacheReadMul: 0.1 },
  'claude-opus-4-6': { in: 5.0, out: 25.0, cacheCreateMul: 1.25, cacheReadMul: 0.1 },
  'claude-opus-4-7': { in: 5.0, out: 25.0, cacheCreateMul: 1.25, cacheReadMul: 0.1 },
};

/** model + usage 객체 → 예상 비용($). 미등록 모델은 null. */
export function computeCostUsd(model, usage) {
  const p = PRICING[model];
  if (!p || !usage) return null;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const usd =
    (input * p.in +
      output * p.out +
      cacheCreate * p.in * p.cacheCreateMul +
      cacheRead * p.in * p.cacheReadMul) /
    1_000_000;
  return usd;
}

function emptyBucket() {
  return { calls: 0, input: 0, output: 0, cacheCreate: 0, cacheRead: 0, costUsd: 0 };
}

export function createUsageTracker() {
  let totals = emptyBucket();
  const byModel = new Map();

  function addInto(bucket, usage, cost) {
    bucket.calls += 1;
    bucket.input += usage.input_tokens ?? 0;
    bucket.output += usage.output_tokens ?? 0;
    bucket.cacheCreate += usage.cache_creation_input_tokens ?? 0;
    bucket.cacheRead += usage.cache_read_input_tokens ?? 0;
    if (cost != null) bucket.costUsd += cost;
  }

  function record({ model, usage } = {}) {
    if (!model || !usage) return;
    const cost = computeCostUsd(model, usage);
    addInto(totals, usage, cost);
    let m = byModel.get(model);
    if (!m) {
      m = emptyBucket();
      byModel.set(model, m);
    }
    addInto(m, usage, cost);
  }

  function summary() {
    // 캐시 히트율 = cacheRead / (input + cacheCreate + cacheRead).
    // 0% = 캐시 안 됨, 100% = 매번 전체 캐시 적중.
    const cacheableTotal = totals.input + totals.cacheCreate + totals.cacheRead;
    const cacheHitRate = cacheableTotal > 0 ? totals.cacheRead / cacheableTotal : 0;
    return {
      totalCalls: totals.calls,
      tokens: {
        input: totals.input,
        output: totals.output,
        cacheCreate: totals.cacheCreate,
        cacheRead: totals.cacheRead,
      },
      cacheHitRate: Number(cacheHitRate.toFixed(4)),
      estimatedCostUsd: Number(totals.costUsd.toFixed(6)),
      byModel: Object.fromEntries(
        [...byModel.entries()].map(([k, v]) => [
          k,
          {
            ...v,
            costUsd: Number(v.costUsd.toFixed(6)),
          },
        ]),
      ),
    };
  }

  function reset() {
    totals = emptyBucket();
    byModel.clear();
  }

  return { record, summary, reset };
}

/** 앱 전역 공유 인스턴스. anthropic 클라이언트들이 호출 후 record로 보고. */
export const globalUsageTracker = createUsageTracker();
