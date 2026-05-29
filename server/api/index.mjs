// Vercel 서버리스 함수 진입점. vercel.json이 모든 경로를 여기로 rewrite하고,
// Hono가 원래 경로(/api/fortune 등)로 라우팅한다.

import { handle } from 'hono/vercel';
import app from '../src/app.mjs';

export const config = { runtime: 'nodejs' };

export default handle(app);
