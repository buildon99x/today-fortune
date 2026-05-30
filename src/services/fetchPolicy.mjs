// fetch 회복탄력성(타임아웃/재시도/Abort) 결정 로직. fetch·AbortController·timer를
// 주입받아 전부 테스트 가능하게 한다(§7.A/7.B). 30-60s LLM 호출을 견디는 게 목적.

export const DEFAULT_FORTUNE_POLICY = {
  timeoutMs: 65000, // LLM 생성 30-60s + 여유
  maxRetries: 2,
  backoffMs: [1000, 3000],
};

/** 재시도 대상 상태인지(네트워크 에러는 status 없이 호출돼 true). 400/501은 비재시도. */
export function shouldRetry(status, attempt, maxRetries) {
  if (attempt >= maxRetries) return false;
  if (status == null) return true; // 네트워크 에러
  if (status === 429) return true;
  if (status === 501) return false; // 미구성 계약 상태 — 재시도 무의미
  if (status >= 500) return true;
  return false;
}

/** attempt(0-based) → 대기(ms). 배열 끝을 넘으면 마지막 값으로 클램프. */
export function nextDelay(attempt, backoff) {
  if (!backoff || backoff.length === 0) return 0;
  return backoff[Math.min(attempt, backoff.length - 1)];
}

class TaggedError extends Error {
  constructor(name, message, status) {
    super(message);
    this.name = name;
    if (status != null) this.status = status;
  }
}

/**
 * @param {{
 *   fetch: typeof fetch,
 *   AbortController: typeof AbortController,
 *   setTimeout: typeof setTimeout,
 *   clearTimeout: typeof clearTimeout,
 *   sleep?: (ms: number) => Promise<void>,
 *   policy?: { timeoutMs: number, maxRetries: number, backoffMs: number[] },
 * }} deps
 */
export function createResilientFetch(deps) {
  const {
    fetch: doFetch,
    AbortController: AC,
    setTimeout: setT,
    clearTimeout: clearT,
    policy = DEFAULT_FORTUNE_POLICY,
  } = deps;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setT(r, ms)));

  return async function request(url, options = {}) {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AC();
      const timer = setT(() => controller.abort(), policy.timeoutMs);
      try {
        const res = await doFetch(url, { ...options, signal: controller.signal });
        clearT(timer);
        if (!res.ok && shouldRetry(res.status, attempt, policy.maxRetries)) {
          await sleep(nextDelay(attempt, policy.backoffMs));
          attempt += 1;
          continue;
        }
        return res; // ok 또는 비재시도 상태(400/501/4xx) → 호출부가 처리.
      } catch (e) {
        clearT(timer);
        const timedOut = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
        if (!shouldRetry(null, attempt, policy.maxRetries)) {
          throw timedOut
            ? new TaggedError('TimeoutError', '요청이 시간 안에 닿지 못했어요.')
            : new TaggedError('NetworkError', '네트워크 흐름이 잠시 끊겼어요.');
        }
        await sleep(nextDelay(attempt, policy.backoffMs));
        attempt += 1;
      }
    }
  };
}
