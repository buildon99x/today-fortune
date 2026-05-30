// Vercel 진입점 심(shim). 루트에서 배포 시 /api → server/api로 위임.
// 루트 vercel.json이 installCommand를 "cd server && npm install"로 설정해
// node_modules는 server/ 아래에만 설치된다. 상대 경로가 모두 server/ 기준이므로 정상 동작.
export { default, config } from '../server/api/index.mjs';
