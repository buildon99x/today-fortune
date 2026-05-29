// 로컬 개발용 서버. 실행: ANTHROPIC_API_KEY=... npm run dev  (npm install 필요)
// Vercel 배포는 이 파일을 쓰지 않는다 — api/index.mjs가 진입점.

import { serve } from '@hono/node-server';
import app from './app.mjs';

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`fortune backend (local) listening on :${port}`);
