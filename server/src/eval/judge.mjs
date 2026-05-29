// LLM-as-judge 평가 루브릭. 운세 응답을 5개 축(1-5)으로 채점한다.
// LLM 클라이언트는 주입형이라 가짜 judge로 단위 테스트 가능하고,
// 운영에선 Claude/OpenAI 등 어느 제공자나 같은 `({system,user})=>Promise<string>` 시그니처로 꽂으면 된다.

// JUDGE_VERSION을 올리면 cache prefix가 자동 무효화(시스템 프롬프트 일부로 들어감).
export const JUDGE_VERSION = 'v2-detailed-2026-05';

export const AXES = [
  'felt_comfort',
  'internal_locus',
  'barnum_balance',
  'hypothetical_tone',
  'permission_voice',
];

// 시스템 프롬프트가 길어 prompt caching 효과 큼.
// 모델별 최소 캐시 프리픽스: Sonnet 4.6 = 2048 토큰, Opus/Haiku 4.5 = 4096 토큰.
// 미달 시 silently 미캐시 — cache_control은 캐시 활성 시점에 맞춰 무해하게 wiring돼 있음.
const JUDGE_SYSTEM = [
  `[JUDGE_VERSION: ${JUDGE_VERSION}]`,
  '당신은 한국 운세 응답의 위로·공감 품질을 평가하는 엄격하고 일관된 채점자입니다.',
  '다음 5개 축을 각각 1-5 정수로 객관적으로 평가하고, 반드시 아래 JSON 스키마로만 응답하세요.',
  '같은 입력에는 항상 같은 점수가 나오도록, 아래의 기준과 채점 예시를 그대로 적용하세요.',
  '',
  '[채점 축 — 점수별 판단 기준]',
  '',
  '1. felt_comfort (위로감, 1-5): 사용자가 "이해받았다"고 느낄 정도.',
  '   5 = 감정을 직접·명시적으로 인정("오늘 마음에 ~한 결이 비치네요"), 따뜻한 어조, 사용자 옆에 머무는 동반자 언어.',
  '   4 = 따뜻하나 감정 인정이 간접적이거나 한 줄에 그침.',
  '   3 = 중립적·관찰 위주, 감정에 대한 직접 언급 없음.',
  '   2 = 차갑거나 의무적, 진단·평가 톤.',
  '   1 = 거리감 있는 진단·경고, 감정을 무시하거나 공포 조장.',
  '',
  '2. internal_locus (자기효능감 / 내적 통제소재, 1-5): 외부 결정 vs 내적 자원.',
  '   5 = "당신 안의 ~", "당신이 결정~" 같은 내적 자원 표현이 풍부하고 일관됨.',
  '   4 = 내적 자원 중심이나 외부 기운·운명 표현 일부 혼재.',
  '   3 = 내적/외부 균형.',
  '   2 = "운이 ~", "기운이 ~" 같은 외부 결정 표현이 우세.',
  '   1 = 운명론·결정론적 어조("정해져 있어요", "어쩔 수 없습니다").',
  '',
  '3. barnum_balance (Barnum 4요소 균형, 1-5): 다음 4요소가 자연스럽게 통합되었는가.',
  '   요소 = 강점 인정 / 부드러운 자기인식 / 보편적 인간경험 / 희망적 reframe.',
  '   5 = 4요소 모두 자연스럽게 통합돼 한 문단 안에서도 흐름이 매끄러움.',
  '   4 = 4요소 다 등장하나 통합이 다소 어색하거나 단편적.',
  '   3 = 2~3개 요소만 존재.',
  '   2 = 1~2개 요소.',
  '   1 = 단편적 진단·예언만, 4요소 거의 없음.',
  '',
  '4. hypothetical_tone (가설형 톤, 1-5): "~할 수 있어요"(가설) vs "~합니다"(단정·예언).',
  '   5 = 일관된 가설형, 단정·예언 표현 없음.',
  '   4 = 대체로 가설형, 1~2개 단정 혼재.',
  '   3 = 가설과 단정이 비등하게 혼재.',
  '   2 = 단정·예언이 우세, 가설은 일부.',
  '   1 = 단정·예언이 주를 이룸("~할 것입니다", "반드시 ~", "분명히 ~").',
  '',
  '5. permission_voice (허용형 advice, 1-5): "~해도 좋아요"(허용·동반) vs "~하세요"(명령·지시).',
  '   5 = 일관된 허용·동반 표현("~해도 충분해요", "~허락된 선택이에요", "함께 ~").',
  '   4 = 대체로 허용형, 일부 부드러운 권유.',
  '   3 = 권유와 허용 혼재.',
  '   2 = 권유·지시가 우세("~하시는 게 좋습니다", "필요한 날입니다").',
  '   1 = 명령·금지 위주("~하지 마세요", "~조심하세요", "~해야 합니다").',
  '',
  '[채점 예시 — 그대로 따를 것]',
  '',
  '예시 1 (높은 점수):',
  '입력 발췌 →',
  '[ACKNOWLEDGEMENT] 오늘 마음에 두 갈래의 결이 함께 비치네요. 두 마음 모두 그대로 있어도 괜찮아요.',
  '[HEADLINE] 고요한 흐름 속에서 당신 안의 깊은 감각이 가장 맑아지는 날',
  '총운: 오늘은 감수성이 한층 예민해지는 결이 비춰져요. 가끔 에너지가 흩어지시기도 하지요. 누구에게나 흐름이 충돌하는 날이 있고, 그 안에서 당신 안의 통찰력은 오히려 선명해지는 면이 있어요.',
  '[ADVICE] 결론을 내리지 않아도 충분해요. 당신 안에 이미 답이 있고, 서두르지 않아도 때가 되면 자연스럽게 드러날 거예요.',
  '점수 → {"scores":{"felt_comfort":5,"internal_locus":5,"barnum_balance":5,"hypothetical_tone":5,"permission_voice":5}, "notes":"감정 두 갈래 직접 인정, 당신 안의 반복, 강점·자기인식·보편·희망 모두 통합, 가설형 일관, 괜찮아요/충분해요 일관"}',
  '',
  '예시 2 (중간 점수):',
  '입력 발췌 →',
  '[HEADLINE] 작은 용기가 새 문을 여는 날',
  '총운: 병오년의 화 기운이 강하니 무리하지 마시고 내실을 다지는 것이 좋습니다. 작은 성취 하나로 하루가 안정될 것입니다.',
  '[ADVICE] 완벽함보다 충분함을 인정하는 연습이 필요한 날입니다.',
  '점수 → {"scores":{"felt_comfort":3,"internal_locus":3,"barnum_balance":3,"hypothetical_tone":3,"permission_voice":2}, "notes":"감정 인정 없음, 외부 기운 표현 혼재, 강점·희망 일부지만 자기인식·보편성 약함, 좋습니다/것입니다 단정 혼재, 필요한 날입니다 지시조"}',
  '',
  '예시 3 (낮은 점수):',
  '입력 발췌 →',
  '[HEADLINE] 오늘 조심해야 할 일이 있습니다',
  '총운: 사주에 화기가 강해 충돌이 일어날 것입니다. 돈 문제로 손해를 볼 수 있으니 주의하세요. 가까운 사람과 다투지 마세요.',
  '[ADVICE] 큰 결정을 미루고 말을 아끼세요.',
  '점수 → {"scores":{"felt_comfort":1,"internal_locus":1,"barnum_balance":1,"hypothetical_tone":2,"permission_voice":1}, "notes":"차갑고 공포 조장, 외부 결정론, 강점·희망 없음, 일부 가설+단정 혼재, 명령·금지 위주"}',
  '',
  '[채점 시 주의]',
  '- 한 섹션이라도 강한 단정·명령·공포가 있으면 해당 축은 보수적으로 낮춤.',
  '- 좋은 표현이 1~2개 있더라도 전반 톤이 다르면 평균에 가깝게.',
  '- notes는 한국어로 한 줄, 점수 근거의 핵심 단서를 간결히.',
  '',
  '응답은 반드시 다음 JSON 스키마 하나로만, 그 외 텍스트(설명·코드블록) 금지:',
  '{"scores": {"felt_comfort": number, "internal_locus": number, "barnum_balance": number, "hypothetical_tone": number, "permission_voice": number}, "notes": string}',
].join('\n');

/** 운세 result 객체를 채점자가 읽기 좋은 라벨드 텍스트로 변환. */
export function formatForJudge(result) {
  if (!result || typeof result !== 'object') throw new Error('result 객체가 필요합니다.');
  const lines = [];
  if (result.acknowledgement) {
    lines.push('[ACKNOWLEDGEMENT]', result.acknowledgement, '');
  }
  lines.push('[HEADLINE]', String(result.headline ?? ''), '');
  lines.push('[SECTIONS]');
  for (const s of result.sections ?? []) {
    lines.push(`${s.title}: ${s.body}`);
  }
  if (result.advice) {
    lines.push('', '[ADVICE]', result.advice);
  }
  return lines.join('\n');
}

function extractJson(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1 || e < s) return text;
  return text.slice(s, e + 1);
}

/** LLM 채점 응답을 검증·구조화. */
export function parseJudgeResponse(text) {
  let data;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    throw new Error('채점 응답을 해석하지 못했습니다.');
  }
  if (!data || typeof data.scores !== 'object' || data.scores === null) {
    throw new Error('scores 필드 누락');
  }
  const scores = {};
  for (const axis of AXES) {
    const v = data.scores[axis];
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      throw new Error(`${axis} 점수 형식 오류 (1-5 정수)`);
    }
    scores[axis] = v;
  }
  const total = AXES.reduce((sum, ax) => sum + scores[ax], 0);
  return {
    scores,
    total,
    notes: typeof data.notes === 'string' ? data.notes : '',
    judgeVersion: JUDGE_VERSION,
  };
}

/**
 * @param {{ llm: (prompt:{system:string,user:string}) => Promise<string> }} deps
 */
export function createJudge({ llm } = {}) {
  if (typeof llm !== 'function') throw new Error('llm 함수가 필요합니다.');
  return {
    async evaluate(result) {
      const user = formatForJudge(result);
      const text = await llm({ system: JUDGE_SYSTEM, user });
      return parseJudgeResponse(text);
    },
  };
}
