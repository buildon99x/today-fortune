/**
 * SDK 미연결 상태에서 실제 구현이 필요한 함수가 호출될 때 던지는 에러.
 * 개발자가 @apps-in-toss/framework API를 연결하기 전까지 사용된다.
 */
export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
