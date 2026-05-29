// 플러그형 검증 디스패처. proof.type → 등록된 검증 함수로 라우팅하고 리플레이 방어를 적용한다.
//
// 검증 함수 시그니처: (proof) => Promise<{ valid: boolean, transactionId?: string, productId?: string, reason?: string }>
// 레지스트리 반환값: (proof) => Promise<boolean>  (fortune-handler의 verifyProof 시그니처와 호환)

export function createVerifier({ verifiers, replayStore, log = console } = {}) {
  if (!verifiers || typeof verifiers !== 'object') {
    throw new Error('verifiers 맵이 필요합니다.');
  }

  return async function verifyProof(proof) {
    if (!proof || typeof proof !== 'object' || typeof proof.type !== 'string') {
      log.warn?.('[verify] proof 또는 type 누락');
      return false;
    }
    const fn = verifiers[proof.type];
    if (!fn) {
      log.warn?.(`[verify] 미등록 proof.type: ${proof.type}`);
      return false;
    }

    let result;
    try {
      result = await fn(proof);
    } catch (e) {
      log.warn?.(`[verify] ${proof.type} 검증 중 예외: ${e?.message}`);
      return false;
    }
    if (!result?.valid) {
      log.warn?.(`[verify] ${proof.type} 거부: ${result?.reason ?? 'unknown'}`);
      return false;
    }

    if (replayStore) {
      const id = `${proof.type}:${result.transactionId ?? ''}`;
      if (!result.transactionId) {
        log.warn?.(`[verify] ${proof.type} transactionId 누락 — 리플레이 방어 불가, 거부`);
        return false;
      }
      if (await replayStore.has(id)) {
        log.warn?.(`[verify] ${proof.type} 리플레이 감지: ${id}`);
        return false;
      }
      await replayStore.remember(id);
    }
    return true;
  };
}
