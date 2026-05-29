// 운세 엔진 — 입력 검증 → 프롬프트 생성 → LLM 호출 → 구조화 파싱 → 무료/프리미엄 분리.
// LLM 클라이언트는 주입받으므로 네트워크 없이 테스트 가능하다.

import { validateBirthInput } from './validate.mjs';
import { buildFortunePrompt } from './prompt.mjs';

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return text;
  return text.slice(start, end + 1);
}

/** LLM 원문 텍스트를 구조화된 운세 객체로 파싱한다. */
export function parseFortuneResponse(text) {
  let data;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    throw new Error('운세 응답을 해석하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (typeof data.headline !== 'string' || !Array.isArray(data.sections)) {
    throw new Error('운세 응답 형식이 올바르지 않습니다.');
  }
  return {
    acknowledgement: typeof data.acknowledgement === 'string' ? data.acknowledgement : '',
    headline: data.headline,
    sections: data.sections.map((s) => ({
      title: String(s.title ?? ''),
      body: String(s.body ?? ''),
    })),
    luckyItems: data.luckyItems ?? null,
    advice: typeof data.advice === 'string' ? data.advice : '',
  };
}

/**
 * 무료/프리미엄 분리. 무료는 감정 인정(acknowledgement) + 헤드라인 + 첫 섹션만 노출하고
 * 나머지는 잠근다. acknowledgement는 헤드라인 위에 노출돼 첫 경험을 "이해받았다"로 만든다.
 * 수익화: 무료 결과 화면에서 전면광고, 잠긴 영역에서 IAP 해제 유도.
 */
export function splitFreePremium(result) {
  const hasMore = result.sections.length > 1 || result.advice.length > 0;
  return {
    free: {
      acknowledgement: result.acknowledgement,
      headline: result.headline,
      sections: result.sections.slice(0, 1),
      locked: hasMore,
    },
    premium: {
      sections: result.sections.slice(1),
      luckyItems: result.luckyItems,
      advice: result.advice,
    },
  };
}

/**
 * @param {{ llm: (prompt:{system:string,user:string}) => Promise<string> }} deps
 */
export function createFortuneEngine({ llm }) {
  if (typeof llm !== 'function') {
    throw new Error('llm 호출 함수가 필요합니다.');
  }
  return {
    async getFortune(input, options = {}) {
      const profile = validateBirthInput(input);
      const prompt = buildFortunePrompt(profile, options);
      const text = await llm(prompt);
      const result = parseFortuneResponse(text);
      return { result, ...splitFreePremium(result), meta: prompt.meta };
    },
  };
}
