// 생년월일 입력 검증 — 프레임워크 비의존 순수 로직 (단위 테스트 대상)

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  return month === 2 && isLeapYear(year) ? 29 : MONTH_DAYS[month - 1];
}

/**
 * 검증만 수행하고 첫 오류의 한국어 메시지를 반환한다. 통과 시 null.
 * UI에서 throw 없이 인라인 에러를 표시할 때 사용한다.
 * @param {{year:number, month:number, day:number, hour?:number|null, gender?:string, calendar?:string}} input
 */
export function firstBirthInputError(input) {
  const { year, month, day } = input;

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return '연도는 1900~2100 사이로 입력해 주세요.';
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return '월은 1~12 사이로 입력해 주세요.';
  }
  const maxDay = daysInMonth(year, month);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) {
    return `${month}월은 1~${maxDay}일까지 입력할 수 있어요.`;
  }
  const hour = input.hour ?? null;
  if (hour !== null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) {
    return '태어난 시는 0~23 사이로 입력해 주세요.';
  }
  const gender = input.gender ?? 'unspecified';
  if (!['male', 'female', 'unspecified'].includes(gender)) {
    return '성별 값이 올바르지 않습니다.';
  }
  const calendar = input.calendar ?? 'solar';
  if (!['solar', 'lunar'].includes(calendar)) {
    return '음/양력 값이 올바르지 않습니다.';
  }
  return null;
}

/**
 * 입력을 검증하고 정규화한다. 실패 시 사용자에게 보여줄 한국어 메시지로 throw.
 */
export function validateBirthInput(input) {
  const error = firstBirthInputError(input);
  if (error) throw new Error(error);
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? null,
    gender: input.gender ?? 'unspecified',
    calendar: input.calendar ?? 'solar',
  };
}
