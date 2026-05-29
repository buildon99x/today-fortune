// TTL + LRU 인메모리 캐시. 같은 생년월일·유형·날짜 요청의 LLM 재호출을 막아 비용 절감.
// 단일 인스턴스 메모리 — 다중 인스턴스/재시작 영속화가 필요하면 Redis로 교체.

export function createCache({ ttlMs = 3600_000, max = 1000, now = () => Date.now() } = {}) {
  const store = new Map(); // key -> { value, expires }

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (now() > entry.expires) {
      store.delete(key);
      return undefined;
    }
    // LRU: 최근 사용을 맨 뒤로
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  function set(key, value) {
    if (store.has(key)) store.delete(key);
    else if (store.size >= max) store.delete(store.keys().next().value);
    store.set(key, { value, expires: now() + ttlMs });
  }

  return {
    get,
    set,
    get size() {
      return store.size;
    },
  };
}
