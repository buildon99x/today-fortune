// ESLint flat config — 서버(.mjs, Node ESM) + 클라이언트(.ts/.tsx, RN) 전체.
// 포맷은 Prettier에 위임(eslint-config-prettier로 충돌 룰 off)하고, ESLint는 정합성·버그·
// 프라이버시 invariant 강제에 집중한다.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

// AGENTS.md §1.4 — body/profile/ip/receipt/proof를 console.*에 직접 넘기는 것 차단.
// 비식별 메타(storage.mode, provider 등)만 로그 허용. 깊은 속성 누출은 테스트가 추가로 못박음.
const noPlaintextLog = {
  selector:
    'CallExpression[callee.object.name="console"][callee.property.name=/^(log|warn|error|info|debug)$/] > Identifier[name=/^(body|profile|ip|receipt|proof)$/]',
  message:
    'PII 의심 식별자(body/profile/ip/receipt/proof)를 console.*에 직접 넘기지 마라 (AGENTS.md §1.4). 비식별 메타만 로그.',
};

export default tseslint.config(
  { ignores: ['**/node_modules/**', 'dist/**', 'build/**', '.vercel/**'] },

  js.configs.recommended,

  // 서버 + 클라이언트 공통 .mjs / .js (Node ESM, Metro도 동일 번들)
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-restricted-syntax': ['error', noPlaintextLog],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // 프라이버시/아키텍처 게이트 — AGENTS.md §2.1:
  // handler/app/core 에서 LLM 클라이언트를 직접 import 금지. 반드시 llm-router 경유.
  {
    files: ['server/src/fortune-handler.mjs', 'server/src/app.mjs', 'server/core/**/*.mjs'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/anthropic-client.mjs',
                '**/claude-cli-client.mjs',
                '**/anthropic-judge-client.mjs',
              ],
              message:
                'LLM 클라이언트를 직접 import하지 마라. llm-router.mjs의 pickFortuneLlm()/pickJudgeLlm() 경유 (AGENTS.md §2.1).',
            },
          ],
        },
      ],
    },
  },

  // 클라이언트 TypeScript / TSX (React Native)
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // 미구현 스텁의 의도적 미사용 인자(_productId 등)는 허용.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // 테스트 — node:test 사용. 미사용 import 등은 동일 룰 유지하되 편의상 완화 여지.
  {
    files: ['**/__tests__/**', '**/*.test.{mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // 포맷 충돌 룰 off — 반드시 마지막.
  prettier,
);
