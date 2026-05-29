# AGENTS.md — 이 저장소에서 코드 작업하는 모든 에이전트(사람·AI)용 지침

> 이 파일은 Claude/Codex/Gemini 등 어느 AI 에이전트가 작업해도 동일하게 적용된다.
> Claude Code는 `CLAUDE.md`를 통해 이 파일을 우선 읽는다.

이 프로젝트는 **DB 없음 / PII 휘발** 정책으로 운영된다. 한 번 위반된 가정은 잘 안 보인다 — 아래 규칙은 **테스트와 부팅 가드로 코드에 박혀 있으니** 우회하지 마라.

---

## 0. 변경 전 필수 읽기

1. `PRIVACY.md` — 휘발/해시 정책
2. 이 문서의 §1 (Privacy invariant) — 어겼을 때 회귀가 가장 큰 영역

---

## 1. Privacy invariant — 절대 깨지 않는 것들

### 1.1 영구 저장소에 들어가는 모든 식별자는 `hashIdentifier()` 통과

| 무엇을 | 어디 | 어떻게 |
|---|---|---|
| 생년월일 프로필 → 캐시 키 | `fortune-handler.makeCacheKey` | `hashIdentifier(canonical, 'fortune-cache')` |
| IP → 레이트리밋 키 | `rate-limit.mjs`, `redis-rate-limit.mjs` | `hashIdentifier(key, 'rate-limit')` |
| 영수증 ID → 리플레이 키 | `replay-store.mjs` (인메모리·Redis 양쪽) | `hashIdentifier(id, 'replay')` |

**새 식별자가 생기면** `src/util/hash-id.mjs`의 `hashIdentifier(value, namespace)` 를 사용. namespace는 새 문자열을 명시(기존 namespace와 충돌 X). 평문이 Redis/Map에 그대로 들어가는 PR은 거부 대상.

### 1.2 평문 부재(absence)는 테스트로 못박혀 있다

다음 테스트를 깨뜨리지 마라. 새 식별자 추가 시 같은 패턴으로 테스트 추가 필수:

- `__tests__/fortune-handler.test.mjs` — `makeCacheKey returns hashed hex (no plaintext PII)`
- `__tests__/replay-store.test.mjs` — `redis: ... hashes the id (no plaintext)`
- `__tests__/redis-rate-limit.test.mjs` — `hashes IP into Redis key — plaintext IP absent`

테스트는 **속성**(평문이 키 안에 없음)을 검증하지 구현을 검증하지 않는다. 같은 형식으로 새 케이스 추가.

### 1.3 부팅 가드 우회 금지

`server/src/app.mjs` 첫 줄의 `assertPrivacyReady()` 는 production에서 `PRIVACY_HMAC_SECRET` 미설정 시 throw한다. 이 가드를 try/catch로 감싸거나 위치를 옮기지 마라. SHA-256 폴백은 IPv4·생년월일 공간을 무작위 대입으로 역산 가능 — production에서 silent 폴백은 보안 사고.

### 1.4 요청 바디는 로그에 적지 않는다

`console.log`/`console.warn`/`console.error` 어느 것에도 `body`, `profile`, `ip`, `receipt`, `proof` 같은 변수를 넣지 마라. 비식별 메타(`storage.mode`, `verifiers.length`, `provider`)만 허용.

### 1.5 IP는 신뢰 헤더 순서로만

`clientIp` 함수의 우선순위: `x-vercel-forwarded-for` > `x-real-ip` > `x-forwarded-for`. **이 순서를 바꾸지 마라.** XFF는 위조 가능하므로 폴백으로만 사용.

### 1.6 `/api/privacy` 응답은 코드 사실만

`/api/privacy` JSON과 `PRIVACY.md`는 **코드가 실제로 강제하는 것**만 적어야 한다. "기본 ~30일", "ZDR 시 0" 같은 검증 불가 외부 사실 언급 금지(운영자 결정 사항). 정책 변경 시 코드 → 테스트 → /api/privacy → PRIVACY.md 4곳 동시 갱신.

### 1.7 캐시는 명시적 활성화

`FORTUNE_CACHE_TTL_SEC` 기본 `0`(휘발). 캐시 활성화는 응답 시간 사이드채널(같은 입력 재요청 시 ms 단위 차이) 위험을 운영자가 명시적으로 수용한 경우만. 기본값을 0이 아닌 값으로 바꾸는 PR은 거부 대상.

---

## 2. 아키텍처 규약 — 깨지면 빠르게 회귀

### 2.1 LLM은 의존성 주입

모든 LLM 소비자(`createFortuneEngine`, `createJudge`, `createFortuneHandler`)는 `llm: ({system, user}) => Promise<string>` 함수를 주입받는다. `app.mjs`와 스크립트는 **반드시 `llm-router.mjs`의 `pickFortuneLlm()` / `pickJudgeLlm()` 경유**. `anthropic-client.mjs`나 `claude-cli-client.mjs`를 비즈니스 코드에서 직접 import 금지.

이유: 환경별(dev/prod) 어댑터 교체 + production 가드(`LLM_PROVIDER=cli` 거부)를 라우터 한 곳에서 보장.

### 2.2 PROMPT_VERSION bump

`core/prompt.mjs`의 시스템 프롬프트나 응답 스키마를 의미있게 바꾸면 **`PROMPT_VERSION` 상수를 같은 PR에서 올린다**. 캐시 키에 포함돼 자동 무효화되고 `/health.promptVersion`·`meta.promptVersion`으로 추적된다. 안 올리면 새 프롬프트인데 옛 결과를 서빙하는 회귀 발생.

### 2.3 JUDGE_VERSION도 동일

`src/eval/judge.mjs`의 채점 기준이 바뀌면 `JUDGE_VERSION` bump. 시스템 프롬프트 첫 줄에 들어 있어 prompt cache 자동 무효화.

### 2.4 신규 영구 저장소 추가 금지

이 프로젝트는 **DB 사용 안 함**. Redis(Upstash/KV)는 TTL 기반 휘발 스토어로만 사용. 영구 테이블/컬렉션 추가는 별도 합의 필요(=PRIVACY.md 정책 재검토 동반).

---

## 3. 변경 후 항상 실행

```bash
cd server && node --test
```

전부 통과해야 한다. 통과 못 한 채로 끝내지 마라.

---

## 4. 안티패턴 — 발견 시 즉시 거부

| 안티패턴 | 왜 안 되는가 | 올바른 형태 |
|---|---|---|
| Redis 키에 `${ip}`, `${profileJson}` 평문 사용 | PII 평문 저장 | `hashIdentifier(value, namespace)` 경유 |
| `console.log(body)`, `console.log(profile)` | 요청 바디 로그 누출 | 비식별 메타만 |
| `try { assertPrivacyReady() } catch {}` | production 가드 우회 | 가드 신뢰, 시크릿을 환경에 설정 |
| `import { anthropicLlm } from './anthropic-client.mjs'` (handler/app 안에서) | 환경별 분기 깨짐 | `await pickFortuneLlm()` |
| `claude -p` 인라인 spawn | 중복·timeout/에러처리 불일치 | `claudeCliFortuneLlm` 또는 라우터 |
| 시스템 프롬프트 수정 후 `PROMPT_VERSION` 그대로 | 캐시가 옛 결과 서빙 | 같은 PR에서 버전 bump |
| `/api/privacy`에 검증 불가 주장 추가 | 거짓 정보 | 코드가 강제하는 사실만 |
| 보안/프라이버시 변경 후 자기 승인 | 사각지대 남음 | `security-reviewer` 에이전트 별도 호출 |
| 기본 `FORTUNE_CACHE_TTL_SEC`을 양수로 변경 | 휘발 정책 깨짐 | 0 유지, 운영자가 env로 결정 |

---

## 5. 새로운 식별자/스토리지 추가 체크리스트

PR 머지 전 자가 점검:

- [ ] 식별자가 `hashIdentifier(value, '<새-namespace>')` 통과하는가
- [ ] 새 namespace가 기존(`fortune-cache` / `rate-limit` / `replay`)과 다른가
- [ ] `__tests__/`에 "평문 부재" assertion이 1개 이상 있는가
- [ ] `PRIVACY.md` 표·`/api/privacy` 응답에 새 식별자가 정직하게 반영됐는가
- [ ] TTL이 명시돼 있는가 (무한 보존 금지)
- [ ] 로그에 평문이 새는 경로 없는가
- [ ] `node --test` 전부 통과하는가

---

## 6. AI 에이전트 전용 — 추가 의무

### 6.1 보안·프라이버시 변경 시 독립 리뷰

`src/util/hash-id.mjs`, `replay-store.mjs`, `rate-limit.mjs`, `redis-rate-limit.mjs`, `fortune-handler.mjs:makeCacheKey`, `app.mjs`의 `clientIp`/`/api/privacy`/`assertPrivacyReady` 호출부를 수정하면 같은 세션에서 자기 승인하지 말고 별도 `security-reviewer` 에이전트 호출.

### 6.2 운세 프롬프트 변경 후 실측

`core/prompt.mjs` 수정 시 최소 3샘플 실제 LLM 호출 + judge 채점으로 회귀 확인. `server/scripts/batch-eval.mjs` 사용.

### 6.3 Vercel 배포 전 체크

- `PRIVACY_HMAC_SECRET` env 설정됐는가 (없으면 부팅 실패)
- `NODE_ENV=production` 설정했는가 (가드 활성)
- `LLM_PROVIDER`가 `cli`가 아닌가 (production에서 거부)
- `FORTUNE_CACHE_TTL_SEC`을 의도적으로 활성화했다면 그 결정이 기록됐는가

---

## 7. 빠른 참조

| 파일 | 책임 |
|---|---|
| `server/src/util/hash-id.mjs` | 모든 식별자 해시화 단일 진실 |
| `server/src/llm-router.mjs` | LLM 어댑터 선택(api/cli) + production 가드 |
| `server/core/prompt.mjs` | 운세 프롬프트 + `PROMPT_VERSION` |
| `server/src/eval/judge.mjs` | LLM-as-judge + `JUDGE_VERSION` |
| `server/src/fortune-handler.mjs` | 요청 처리 + 캐시 키 + free/premium split |
| `server/src/app.mjs` | 부팅·라우팅·정책 표면 |
| `PRIVACY.md` | 사용자·심사자 대상 정책 문서 |
| `/api/privacy` | 기계가독 정책 endpoint |
