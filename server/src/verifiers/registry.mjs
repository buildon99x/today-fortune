// 플러그형 검증 디스패처. proof.type → 등록된 검증 함수로 라우팅하고 리플레이 방어를 적용한다.
//
// 검증 함수 시그니처: (proof) => Promise<{ valid: boolean, transactionId?: string, productId?: string, reason?: string }>
// 레지스트리 반환값: (proof) => Promise<boolean>  (fortune-handler의 verifyProof 시그니처와 호환)

export function createVerifier({ verifiers, replayStore, log = console } = {}) {
  if (!verifiers || typeof verifiers !== 'object') {
    throw new Error('verifiers 맵이 필요합니다.');
  }

  // 옵셔널 체이닝(log.warn?.)을 한 곳에 모은다 — 호출부 분기를 줄여 디스패처 복잡도↓.
  // 로그는 비식별 메타만(§1.4): proof.type·reason만 남기고 영수증 페이로드는 절대 안 적는다.
  const warn = (msg) => log.warn?.(msg);

  // 리플레이 방어를 별도 책임으로 분리(§7.J). transactionId 없으면 방어 불가이므로 거부.
  async function rememberOnce(proof, result) {
    if (!replayStore) return true;
    if (!result.transactionId) {
      warn(`[verify] ${proof.type} transactionId 누락 — 리플레이 방어 불가, 거부`);
      return false;
    }
    const id = `${proof.type}:${result.transactionId}`;
    if (await replayStore.has(id)) {
      warn(`[verify] ${proof.type} 리플레이 감지: ${id}`);
      return false;
    }
    await replayStore.remember(id);
    return true;
  }

  return async function verifyProof(proof) {
    if (!proof || typeof proof !== 'object' || typeof proof.type !== 'string') {
      warn('[verify] proof 또는 type 누락');
      return false;
    }
    const fn = verifiers[proof.type];
    if (!fn) {
      warn(`[verify] 미등록 proof.type: ${proof.type}`);
      return false;
    }

    let result;
    try {
      result = await fn(proof);
    } catch (e) {
      warn(`[verify] ${proof.type} 검증 중 예외: ${e?.message}`);
      return false;
    }
    if (!result?.valid) {
      warn(`[verify] ${proof.type} 거부: ${result?.reason ?? 'unknown'}`);
      return false;
    }

    return rememberOnce(proof, result);
  };
}
