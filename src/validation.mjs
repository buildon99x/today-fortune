// 클라이언트 입력 검증 — UX용(인라인 에러). 서버가 동일 검증을 권위 있게 다시 수행하므로
// 여기서 일부 어긋나도 서버가 400 + 한국어 메시지로 막는다. RN/Metro가 .mjs를 번들한다.

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  return month === 2 && isLeapYear(year) ? 29 : MONTH_DAYS[month - 1];
}

/** 첫 오류의 한국어 메시지를 반환, 통과 시 null. */
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
  return null;
}
