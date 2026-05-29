// 번들러(Metro/babel)가 빌드 시 인라인하는 process.env 최소 타입 선언.
// RN 런타임엔 Node 전역이 없으므로 @types/node로 전체를 끌어오지 않고, 실제로
// 사용 가능한 env 접근만 좁게 타이핑한다(없는 Node API 오용 방지).
declare const process: {
  env: Record<string, string | undefined>;
};
