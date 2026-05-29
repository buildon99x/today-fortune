# AI 운세 미니앱 (앱인토스)

앱인토스(Apps in Toss)에 출시하는 AI 운세 미니앱 스타터. "가장 빠른 수익화" 목표로
RN/앱인토스 클라이언트 + Vercel 배포형 Claude 백엔드를 담았습니다.

> **이 저장소의 정직한 상태**
> - ✅ **검증됨 (테스트 117개, `npm test`)**: 백엔드 운세 엔진(공감 강화 프롬프트 + `acknowledgement` 필드)/핸들러(promptVersion 캐시 무효화)/캐시·레이트리밋(인메모리+Redis)/검증 레지스트리·리플레이 방어/Google·광고 검증기/Apple 팩토리/**LLM-as-judge 5축 채점**(채점 예시 포함 상세 시스템 프롬프트 + prompt caching wiring)/**judge 교차 검증기**(드리프트 모니터링)/**사용량·비용·캐시 히트율 추적기**(/health 노출) + 클라이언트 입력 검증. 의존성 없는 순수 로직.
> - 🛠 **스캐폴드(미검증)**: `src/`(RN 화면·서비스)는 앱인토스 툴체인(`ait`, `@apps-in-toss/framework`)이 있어야 빌드/검수. `server`의 Claude 호출·HTTP는 `npm install` + `ANTHROPIC_API_KEY` 필요. 광고/IAP SDK·영수증 검증은 `TODO` 자리표시자.

---

## 1. 왜 AI 운세 = 가장 빠른 수익화인가

| 레버 | 이유 |
|---|---|
| 빌드 속도 | RN + TDS 껍데기 + LLM 호출이면 끝 |
| 수익 발생 | 결과 직전 **전면광고** → 토스가 채워주고 출시 첫날부터 정산 |
| 재방문 | "오늘의 운세"로 매일 진입 |
| 진입장벽 | 오픈 플랫폼, 1인·사업자등록 없이 콘솔 계정만으로 시작 |

수익 구조: **전면광고(즉시·메인) + IAP 상세풀이/구독(70%·보조)**.

## 2. 구조

```
server/                  # 백엔드 (Vercel 배포 대상, 자체 완결형)
├─ api/index.mjs         #   🛠 Vercel 서버리스 진입점 (hono/vercel)
├─ vercel.json           #   모든 경로 → 함수로 rewrite
├─ core/                 #   ✅ 운세 엔진(검증·프롬프트·LLM·파싱·무료/프리미엄)
├─ src/
│  ├─ app.mjs            #   ✅ Hono 앱 정의(리스닝 없음)
│  ├─ server.mjs         #   🛠 로컬 dev 전용 serve()
│  ├─ fortune-handler.mjs#   ✅ 핸들러(검증·캐시·게이팅) — 테스트됨
│  ├─ cache.mjs          #   ✅ TTL+LRU 캐시 — 테스트됨
│  ├─ rate-limit.mjs     #   ✅ IP 토큰버킷 — 테스트됨
│  └─ anthropic-client.mjs#  🛠 Claude(구조화 출력) — 설치+키 필요
└─ __tests__/

src/                     # 🛠 RN/앱인토스 클라이언트
├─ validation.mjs        #   ✅ UX용 입력 검증(서버가 권위 재검증) — 테스트됨
├─ services/fortuneApi.ts#   백엔드 호출(생년월일만 전송)
├─ services/{ads,iap}.ts #   광고/결제 래퍼(TODO)
├─ screens/, App.tsx
```

**설계**: 운세 생성 로직과 프롬프트는 **서버가 소유**(`server/core`). 클라이언트는 생년월일만 보내고 프롬프트를 만들지 않음 → LLM 무단 사용 차단. 검증은 클라(UX)·서버(권위) 양쪽에서 — 정상적인 이중 검증.

## 3. 데이터 흐름 & 수익화

```
HomeScreen → fortuneApi.fetchFortune(profile)
  → POST /api/fortune  (레이트리밋 → 검증 → 캐시 → Claude → 파싱)
  → 무료만 반환 { acknowledgement, headline, sections(1), locked, meta }
ResultScreen 진입 직전 showInterstitial() (전면광고)
  잠금 영역: IAP 영수증 / 보상형 토큰 → POST /api/fortune/unlock → 프리미엄
```
무료 응답엔 프리미엄을 절대 포함하지 않음(하드 페이월). 프리미엄은 서버 검증 후에만 제공.

**위로·공감 톤**: `server/core/prompt.mjs`의 시스템 프롬프트가 Barnum 4요소(강점·자기인식·보편·희망), 내적 통제소재, 가설형/허용형 톤, anti-toxic-positivity를 명시한다. 응답의 `acknowledgement`(1-2문장 감정 인정)는 헤드라인 위에 노출돼 첫 경험을 "이해받았다"로 만든다.

**프롬프트 버저닝 (캐시 자동 무효화)**: `prompt.mjs`의 `PROMPT_VERSION` 상수가 응답 캐시 키와 `meta.promptVersion`, `/health` 응답에 함께 들어간다. 시스템 프롬프트나 응답 스키마를 의미있게 바꾼 뒤 이 상수를 올리면 캐시된 옛 응답이 자동 무효화돼 즉시 새 톤이 반영된다.

**품질 채점 (LLM-as-judge)**: `server/src/eval/judge.mjs`가 운세 응답을 5축(felt_comfort / internal_locus / barnum_balance / hypothetical_tone / permission_voice) × 1-5로 채점한다. 시스템 프롬프트에 축별 1~5 기준 + 채점 예시 3개(높음/중간/낮음)를 명시해 일관성 확보. `claude` CLI 데모: `node server/scripts/judge-demo.mjs < fortune.json`.

- **모델**: `server/src/eval/anthropic-judge-client.mjs`가 SDK로 호출. 기본 `claude-haiku-4-5`(`JUDGE_MODEL` env로 교체). 채점은 다량·반복이라 비용 우선.
- **Prompt caching**: 시스템 블록에 `cache_control: ephemeral`. 같은 system 반복 호출 시 ~0.1× 비용. 단 최소 캐시 프리픽스(Sonnet 4.6 = 2048 토큰 / Haiku·Opus 4.5 = 4096) 미달 시 silently 미캐시 — 첫 응답 `usage.cache_read_input_tokens`로 확인. `JUDGE_VERSION`이 시스템 프롬프트 머리에 들어가 변경 시 cache prefix 자동 무효화.
- **교차 검증** (`server/src/eval/cross-validator.mjs`): `createCrossValidator({primary, secondary, threshold})`가 두 judge를 병렬 호출해 축별 divergence + `agree` 플래그 계산. 운영 패턴 = primary=Haiku(상시) + secondary=Opus(샘플링 N%) → Haiku 드리프트 감지. `aggregateDivergence(results)`로 N건 일치율·평균/최대 격차 집계해 배포 게이트로 사용 가능.
- **배치 평가 CLI** (`server/scripts/batch-eval.mjs`): `node scripts/batch-eval.mjs 10 [--csv]` → 같은 입력으로 N회 fortune+judge 실행, 축별 mean/min/max/stdev 출력. 프롬프트 안정성("매번 비슷한 품질인가") 검증용. `--csv`로 스프레드시트 추가 분석 가능.

**사용량·비용·캐시 모니터링** (`server/src/usage-tracker.mjs`): 모든 Anthropic 호출 후 `globalUsageTracker.record({model, usage})`로 토큰·캐시·예상비용 누적. `/health`의 `usage` 필드로 노출되어 운영 중 **캐시 히트율**과 **누적 LLM 비용**을 실시간 확인. 모델별(Haiku/Sonnet/Opus 4.6/4.7) 단가 테이블 내장 — cache create는 입력 단가의 1.25×, cache read는 0.1× 로 계산. 인메모리 누적이라 인스턴스 단위로 리셋(장기 메트릭은 Prometheus 등 외부로 export 권장).

## 4. 로컬 검증

```bash
npm test                 # 루트: 클라 + 백엔드 전체 — 117개, 설치 불필요
cd server && npm test    # 백엔드만 113개
```

백엔드 실제 실행:
```bash
cd server && npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev          # http://localhost:8787
curl -s localhost:8787/api/fortune -X POST -H 'content-type: application/json' \
  -d '{"profile":{"year":1990,"month":5,"day":20,"gender":"female"},"options":{"type":"daily"}}'
```

## 5. Vercel 배포

백엔드(`server/`)를 Vercel 서버리스로 배포합니다.

1. 이 저장소를 GitHub에 push → Vercel에서 **New Project**로 임포트
2. **Root Directory = `server`** 로 설정 (중요: 루트가 아니라 server)
   - `server/`가 `core/`를 안에 품고 있어 모노레포/워크스페이스 설정 없이 그대로 배포됨
3. Environment Variables 에 **`ANTHROPIC_API_KEY`** 추가 (선택: `FORTUNE_MODEL`, `ALLOWED_ORIGIN`)
4. Deploy. Framework Preset은 **Other**(자동 감지). `vercel.json`이 모든 요청을 `api/index.mjs`로 보냄
5. 배포 후 확인: `curl https://<your>.vercel.app/health` → `{"ok":true}`
6. 클라이언트의 `FORTUNE_BACKEND_URL`을 배포 URL로 설정

또는 CLI: `cd server && npx vercel`

### Vercel KV (Upstash Redis) — 운영 권장

서버리스 다중 인스턴스에서 캐시·레이트리밋이 의미 있게 동작하려면 공유 저장소가 필요합니다. KV 어댑터가 이미 붙어 있어 **env만 주입하면 자동 전환**됩니다.

1. Vercel 대시보드 → Storage → KV 생성 → 프로젝트에 연결 (또는 Upstash 직접 사용)
2. 환경변수 확인 — Vercel KV 통합이 자동 주입: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Upstash 직접 사용 시 `UPSTASH_REDIS_REST_URL`/`_TOKEN`)
3. 재배포. `app.mjs`가 env를 감지해 Redis로 전환, `GET /health`가 `{"ok":true,"storage":"redis"}` 응답
4. env가 없거나 `@upstash/redis` 설치 실패 시 인메모리로 graceful 폴백 (경고 로그)

- 캐시: 같은 생일·유형·날짜 응답을 인스턴스를 가로질러 공유 → LLM 재호출 차단
- 레이트리밋: IP당 30회/60초 고정 윈도우(원자적 `INCR`)

## 6. LLM 설정 (Claude)

- 기본 `claude-haiku-4-5`(저비용). `FORTUNE_MODEL=claude-opus-4-7` 등으로 교체.
- 구조화 출력으로 유효 JSON 보장. 제공자 교체: `anthropic-client.mjs`를 같은 `({system,user})=>Promise<string>` 함수로 바꾸면 OpenAI/Gemini 전환.

## 7. 보안 & 페이월 검증

- LLM 키는 서버에만. 클라는 프롬프트를 만들지 않음.
- 무료 응답에 프리미엄 미포함. 프리미엄 해제는 **서버 영수증/광고 토큰 검증 통과 후에만** 제공.
- CORS는 운영에서 토스 웹뷰 오리진으로 제한(`ALLOWED_ORIGIN`).

**검증 레지스트리**(`server/src/verifiers/`)가 `proof.type`을 보고 라우팅하고 **리플레이 방어**(같은 영수증 재사용 차단)를 적용합니다. env가 설정된 플랫폼만 자동 활성화:

| proof.type | 활성 조건(env) | 검증 |
|---|---|---|
| `iap_apple` | `APPLE_BUNDLE_ID` + `APPLE_PRODUCT_IDS` + `APPLE_ROOT_CERT_FINGERPRINT_SHA256`(또는 PEM) | StoreKit2 JWS: x5c 체인 → Apple Root 지문 매치 → 리프 키로 서명 검증 → bundleId/productId 클레임 |
| `iap_google` | `GOOGLE_PACKAGE_NAME` + `GOOGLE_PRODUCT_IDS` + `GOOGLE_SERVICE_ACCOUNT_JSON` | RS256 JWT → OAuth → Play Developer API `purchases.products.get` → `purchaseState=0` |
| `rewarded_ad` | `AD_CALLBACK_SECRET` | HMAC-SHA256(`${timestamp}.${payload}`) timingSafe 비교 + 5분 만료 |

리플레이 스토어는 Redis(`KV_*`/`UPSTASH_*`)가 있으면 Redis, 없으면 인메모리(30일 TTL). 하나도 활성화되지 않으면 `/api/fortune/unlock`은 **501**을 반환해 미구성을 명시합니다.

⚠️ Toss 보상형 광고 콜백의 정확한 필드명·서명 방식은 토스 광고 문서로 맞춰 조정하세요(현재 구현은 표준 S2S HMAC 패턴). Toss 전용 IAP 채널이 별도 있다면 같은 레지스트리에 검증기를 추가하면 됩니다.

## 8. 앱인토스 출시 (요약)

> 정확한 명령은 개발자센터: https://developers-apps-in-toss.toss.im/

1. `ait init` → RN/네이티브 + `granite.config.ts`
2. `src/` 병합, 화면을 **TDS 컴포넌트**로 교체(비게임 검수 필수), `FORTUNE_BACKEND_URL`을 Vercel URL로
3. `services/ads.ts`·`iap.ts` `TODO`를 실제 SDK로
4. `ait dev` → `ait build` → 검수 → 출시

## 9. 다음 단계

1. **App Store Connect / Play Console / Toss 광고**에서 상품 ID·번들 ID·서비스 계정·콜백 시크릿 발급 → Vercel env 주입
2. 실제 영수증으로 통합 테스트(StoreKit 샌드박스, Play 라이선스 테스터)
3. 전면광고 + IAP 1종으로 최소 출시 → 첫 매출 확인
4. "오늘의 운세" 푸시/위젯으로 재방문 훅, 유형 추가 + 다작 포트폴리오
