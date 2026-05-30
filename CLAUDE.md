# Claude Code 작업 지침

이 저장소에서 작업하기 전 **반드시 [`AGENTS.md`](./AGENTS.md)를 먼저 읽어라**. 모든 코딩 규칙·프라이버시 invariant·아키텍처 규약·안티패턴의 **단일 진실**은 거기에 있다. 이 문서는 그 게이트웨이이자, AGENTS.md를 못 읽는 상황에서도 치명적 회귀를 막는 최소 안전망이다.

## 핵심 한 줄

**DB 없음 / PII 휘발 / 모든 식별자는 `hashIdentifier()` 통과 / production 부팅 가드(`assertPrivacyReady`) 우회 금지 / 요청 바디는 로그 금지.**

프라이버시·LLM 라우팅·캐시 정책의 전체 맥락과 근거는 → [`AGENTS.md`](./AGENTS.md), [`PRIVACY.md`](./PRIVACY.md)

---

## 변경 후 항상 실행 (통과 못 한 채 끝내지 마라)

```bash
# 테스트 — 전체(서버 140 + 클라 10 = 150) / 서버만 / 클라만
node --test
cd server && node --test
node --test 'src/__tests__/*.test.mjs'

# 린트 + 포맷 (루트에서, 서버 .mjs + 클라 .ts/.tsx 전체)
npm run lint            # eslint . — 정합성 + 프라이버시 invariant 룰
npm run format:check    # prettier --check .
npm run lint:fix        # 자동 수정
npm run format          # prettier --write .
```

ESLint(`eslint.config.mjs`)는 포맷을 Prettier에 위임하고 **버그·프라이버시 invariant**에 집중한다. 두 커스텀 룰이 AGENTS.md를 코드로 강제한다:
- `no-restricted-imports` — handler/app/core에서 LLM 클라이언트 직접 import 차단 (§2.1, 라우터 경유 강제)
- `no-restricted-syntax` — `console.*`에 `body/profile/ip/receipt/proof` 식별자 직접 전달 차단 (§1.4)

보안·프라이버시 파일(§아래 안티패턴 표의 대상)을 건드렸다면 자기 승인하지 말고 별도 `security-reviewer` 에이전트를 호출한다.

---

## 정책 변경 시 4곳 동시 갱신 (가장 놓치기 쉬움)

프라이버시·보존·식별자 정책을 바꾸면 **반드시 같은 PR에서 4곳을 함께** 갱신한다. 한 곳이라도 빠지면 코드와 공개 정책이 어긋난다.

1. **코드** (`hash-id.mjs` / `app.mjs` / 해당 store)
2. **테스트** (`__tests__/`의 "평문 부재" assertion)
3. **`/api/privacy`** 응답 (`server/src/app.mjs`의 기계가독 JSON)
4. **`PRIVACY.md`** (사용자·심사자용 문서)

`/api/privacy`와 `PRIVACY.md`에는 **코드가 실제로 강제하는 사실만** 적는다("기본 ~30일" 등 검증 불가 외부 주장 금지).

---

## 즉시 거부 안티패턴 (전체 표는 AGENTS.md §4)

| 안티패턴 | 올바른 형태 |
|---|---|
| Redis/Map 키에 `${ip}`·`${profileJson}` 평문 | `hashIdentifier(value, '<namespace>')` 경유 |
| `console.log(body/profile/ip/receipt/proof)` | 비식별 메타(`storage.mode`, `provider`)만 |
| `try { assertPrivacyReady() } catch {}` 또는 위치 이동 | 가드 신뢰, 시크릿을 환경에 설정 |
| handler/app에서 `anthropic-client`·`claude-cli-client` 직접 import | `await pickFortuneLlm()` / `pickJudgeLlm()` 경유 |
| 시스템 프롬프트 수정 후 `PROMPT_VERSION`(또는 채점 변경 후 `JUDGE_VERSION`) 그대로 | 같은 PR에서 버전 bump |
| 기본 `FORTUNE_CACHE_TTL_SEC`을 양수로 변경 | 0(휘발) 유지, 운영자가 env로 결정 |
| 신규 영구 DB/테이블 추가 | Redis는 TTL 휘발 store로만. DB 추가는 별도 합의 |

새 식별자/스토리지를 추가할 때의 자가 점검 체크리스트는 AGENTS.md §5.

코드 작성 컨벤션(팩토리+DI·ESM·복잡도·단일 책임 등)은 → **AGENTS.md §7 코드 스타일·복잡도**. 복잡도 임계치(순환 ≤20 / 중첩 ≤4 / 함수 ≤150줄 / 인자 ≤4)는 ESLint `warn`으로 표면화된다.

---

## 클라이언트(React Native, `src/`) 규약

- **클라이언트는 생년월일 프로필만 전송한다.** 프롬프트는 서버가 만든다(`fortuneApi.ts`) — LLM 무단 사용·프롬프트 유출 방지. 클라이언트에서 시스템 프롬프트를 조립하거나 LLM을 직접 호출하지 마라.
- **디바이스 ID·광고 ID(IDFA/AAID)·계정·이름·이메일을 보내지 않는다** (`PRIVACY.md` "받지 않는 것"). 새 필드를 바디에 추가하려면 PRIVACY.md 정책 재검토 동반.
- **클라이언트 검증은 UX용**(인라인 에러)일 뿐, 서버가 동일 검증을 권위 있게 다시 한다(`validation.mjs`). 클라 검증을 느슨히 해도 서버가 400으로 막지만, 둘을 어긋나게 두지 마라.
- **비즈니스 로직은 `.mjs`로 둔다.** Metro/RN이 번들하고 `node --test`로도 검증되도록 `validation.mjs`·`share.mjs` 패턴을 따른다. 새 순수 로직은 `.tsx`에 인라인하지 말고 테스트 가능한 `.mjs`로 분리.
- **프리미엄 상세는 서버에만 있다.** 해제는 영수증/광고 토큰 검증을 거치며, 미구성 시 서버가 501을 반환하므로 호출 측에서 처리(`unlockFortune`).
- **사용자향 문구는 부드러운 한국어 톤**을 유지한다(에러도 안심시키는 문장). 기존 메시지 톤을 참고해 일관성 유지.

---

## 빠른 참조 — 파일 맵

| 파일 | 책임 |
|---|---|
| `server/src/util/hash-id.mjs` | 모든 식별자 해시화 단일 진실 + `assertPrivacyReady` |
| `server/src/llm-router.mjs` | LLM 어댑터 선택(api/cli) + production 가드 |
| `server/src/app.mjs` | 부팅·라우팅·`clientIp`·`/api/privacy` 정책 표면 |
| `server/src/fortune-handler.mjs` | 요청 처리 + 캐시 키(`makeCacheKey`) + free/premium split |
| `server/core/prompt.mjs` | 운세 프롬프트 + `PROMPT_VERSION` |
| `server/src/eval/judge.mjs` | LLM-as-judge + `JUDGE_VERSION` |
| `server/src/verifiers/` | Apple/Google/보상광고 영수증 검증 + 리플레이 방어 |
| `src/services/fortuneApi.ts` | 백엔드 API 클라이언트(프로필만 전송) + resilient fetch 주입 |
| `src/validation.mjs` / `src/share.mjs` | 클라 검증·공유 메시지(순수 로직, 테스트됨) |
| `src/screens/` | HomeScreen(입력)·ResultScreen(결과) |
| `src/theme/tokens.mjs` | 디자인 토큰(색·간격·타이포·다크) 단일 진실 + `selectPalette` |
| `src/i18n/` | 사용자 문구 테이블(`strings.ko.mjs`) + 경량 translator |
| `src/services/fetchPolicy.mjs` / `errorCatalog.mjs` | 타임아웃·재시도·Abort / 상태코드→문구 |
| `src/monetization/unlockMachine.mjs` | 해제 라이프사이클 리듀서(구매·복원·pending·취소·재시도) |
| `src/persistence/inputStore.mjs` | 입력 영속화(5필드만, storage 주입, 손상값 무시) |
| `src/feedback/hapticIntent.mjs` | 햅틱 결정(순수) + `createHaptics`(trigger 주입) |
| `src/components/` · `src/hooks/` | RN 래퍼(Button/Card/… ) + 훅 — **TDS 교체는 여기만 국소 수정** |
| `PRIVACY.md` / `/api/privacy` | 사람용 / 기계가독 정책 (코드와 동기화) |

> 클라 규약(§7.B): 모든 순수 로직은 테스트되는 `.mjs`로, `.tsx`는 그 위 얇은 껍데기. 검증 게이트는 `node --test 'src/__tests__/*.test.mjs'`(무설치). 결제/광고 SDK·TDS 실연동은 `iap.ts`/`ads.ts`·`components/`라는 단일 seam에서 마무리.
