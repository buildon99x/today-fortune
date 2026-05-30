// 사용자향 한국어 문구 단일 테이블. 화면에 흩어진 카피를 verbatim으로 옮겨
// 톤 일관성·다국어 대비를 확보한다. 값은 절대 변형하지 말 것(테스트가 정확 문자열을 못박음).
// 새 언어는 strings.<locale>.mjs 추가 후 index.mjs의 createTranslator에 주입.

export const ko = {
  common: {
    backToInput: '다시 입력하기',
    retry: '다시 시도',
  },
  home: {
    title: 'AI 운세',
    subtitle: '생년월일을 입력하면 오늘의 흐름을 짚어드려요.',
    birthLabel: '생년월일',
    genderLabel: '성별',
    typeLabel: '운세 유형',
    privacyNote: '🔒 본인을 알 수 있는 정보는 서버에 남지 않아요.',
    privacyA11yLabel: '자물쇠',
    cta: '운세 보기',
    fillAll: '생년월일을 모두 입력해 주세요.',
    yearPlaceholder: '1995',
    monthPlaceholder: '07',
    dayPlaceholder: '15',
    yearA11yLabel: '태어난 연도',
    monthA11yLabel: '태어난 월',
    dayA11yLabel: '태어난 일',
    genders: { female: '여성', male: '남성', unspecified: '선택안함' },
    types: {
      daily: { label: '오늘의 운세', hint: '오늘 하루의 흐름과 마음의 결을 짚어드려요.' },
      saju: { label: '사주 총운', hint: '타고난 사주의 큰 결과 올해의 방향을 살펴봐요.' },
      love: { label: '애정운', hint: '관계와 마음, 곁에 있는 사람과의 흐름을 봐요.' },
      wealth: { label: '재물운', hint: '돈과 일의 흐름, 결정의 타이밍을 살펴봐요.' },
    },
  },
  result: {
    share: '친구에게 공유하기',
    shareError: '공유를 잠시 열지 못했어요. 다시 시도해 주실래요?',
    adviceTitle: '오늘의 조언',
    lucky: { color: '행운의 색', number: '행운의 숫자', direction: '행운의 방향' },
    locked: {
      title: '🔒 상세 운세 · 행운 아이템 · 조언',
      teaser: '오늘의 흐름은 관계운과 조언에서 한 번 더 깊어져요.',
      sub: '전체 운세를 열어 행운의 색·숫자·방향까지 함께 받아보세요.',
      unlock: '전체 운세 해제',
      unlockByAd: '광고 보고 무료로 해제',
      restore: '구매 복원',
    },
    // LLM 호출 30-60s 동안 정지로 보이지 않게 회전. 첫 메시지는 대기 이유를 짧게 알려 이탈 ↓.
    loadMessages: [
      '천천히 살피는 게 더 정확해서요…',
      '사주의 결을 하나씩 읽고 있어요…',
      '마음에 닿을 한 줄을 다듬는 중이에요…',
      '곧 보여드릴게요…',
    ],
    typeLabels: { daily: '오늘의 운세', saju: '사주 총운', love: '애정운', wealth: '재물운' },
    purchasing: '전체 운세를 준비하고 있어요…',
    advertising: '광고를 준비하고 있어요…',
    restoring: '이전 구매를 확인하고 있어요…',
    cancelled: '해제를 멈췄어요. 준비되면 언제든 다시 열 수 있어요.',
    restoreNone: '복원할 구매가 없어요. 전체 운세를 열면 바로 받아보실 수 있어요.',
  },
  errors: {
    // 톤: 경고어("실패/오류") 대신 "흐림" 은유 + 부드러운 재시도 요청.
    rateLimited: '지금은 많은 분이 같은 흐름을 찾고 있어요. 잠시 후 다시 닿아볼게요.',
    badInput: '입력을 한 번만 더 살펴봐 주실래요?',
    loadFallback: '오늘의 흐름이 잠시 흐려졌어요. 조금 뒤에 다시 보여드릴게요.',
    unlockNotReady: '전체 운세는 곧 열어드릴 수 있게 준비 중이에요.',
    unlockFallback: '전체 운세를 펼치는 중에 흐름이 잠깐 흐트러졌어요. 다시 한 번 시도해 주실래요?',
  },
};
