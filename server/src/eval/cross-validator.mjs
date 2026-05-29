// Judge 교차 검증기 — 같은 입력을 primary/secondary 두 채점기로 병렬 채점하고
// 축별·총점 divergence와 agree 플래그를 계산한다.
//
// 운영 패턴: primary=Haiku judge(비용 우선, 다량 평가), secondary=Opus judge(주기적 드리프트 검증).
// 모든 평가에 secondary를 돌리면 비용이 두 배가 되므로, 호출 측에서 샘플링(예: 5%)을 적용한다.
//
// agree = max(축별 |primary-secondary|) <= threshold.

import { AXES } from './judge.mjs';

export function createCrossValidator({ primary, secondary, threshold = 1 } = {}) {
  if (!primary || typeof primary.evaluate !== 'function') {
    throw new Error('primary judge가 필요합니다.');
  }
  if (!secondary || typeof secondary.evaluate !== 'function') {
    throw new Error('secondary judge가 필요합니다.');
  }

  return {
    async evaluate(result) {
      const [p, s] = await Promise.all([primary.evaluate(result), secondary.evaluate(result)]);

      const byAxis = {};
      let maxAxisDiff = 0;
      let sumAxisDiff = 0;
      for (const ax of AXES) {
        const d = Math.abs(p.scores[ax] - s.scores[ax]);
        byAxis[ax] = d;
        if (d > maxAxisDiff) maxAxisDiff = d;
        sumAxisDiff += d;
      }
      const totalDiff = Math.abs(p.total - s.total);

      return {
        primary: p,
        secondary: s,
        divergence: {
          byAxis,
          maxAxisDiff,
          sumAxisDiff,
          totalDiff,
          threshold,
          agree: maxAxisDiff <= threshold,
        },
      };
    },
  };
}

/**
 * N건의 cross-validation 결과에서 드리프트 통계를 집계.
 * 정기 모니터링 / 배포 게이트에 사용.
 */
export function aggregateDivergence(crossResults) {
  if (!Array.isArray(crossResults) || crossResults.length === 0) {
    throw new Error('crossResults가 비어 있습니다.');
  }
  const n = crossResults.length;
  const agreeCount = crossResults.filter((r) => r.divergence.agree).length;
  const maxDiffs = crossResults.map((r) => r.divergence.maxAxisDiff);
  const totalDiffs = crossResults.map((r) => r.divergence.totalDiff);

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const max = (xs) => xs.reduce((a, b) => (a > b ? a : b), -Infinity);

  return {
    n,
    agreeRate: agreeCount / n,
    maxAxisDiff: { mean: mean(maxDiffs), max: max(maxDiffs) },
    totalDiff: { mean: mean(totalDiffs), max: max(totalDiffs) },
  };
}
