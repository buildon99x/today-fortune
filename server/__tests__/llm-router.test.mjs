import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickFortuneLlm, pickJudgeLlm, describeProvider } from '../src/llm-router.mjs';
import { claudeCliFortuneLlm, claudeCliJudgeLlm } from '../src/claude-cli-client.mjs';

// 라우터는 lazy dynamic import. 매 호출마다 env를 평가하므로 env를 세팅·복원해 분기 확인.
async function withEnv(overrides, fn) {
  const orig = {};
  for (const k of Object.keys(overrides)) orig[k] = process.env[k];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(orig)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('LLM_PROVIDER=cli — CLI 어댑터를 돌려준다', async () => {
  await withEnv({ LLM_PROVIDER: 'cli', NODE_ENV: undefined }, async () => {
    assert.equal(await pickFortuneLlm(), claudeCliFortuneLlm);
    assert.equal(await pickJudgeLlm(), claudeCliJudgeLlm);
  });
});

test('LLM_PROVIDER 대소문자 무시 — cli', async () => {
  await withEnv({ LLM_PROVIDER: 'CLI', NODE_ENV: undefined }, async () => {
    assert.equal(await pickFortuneLlm(), claudeCliFortuneLlm);
  });
});

test('알 수 없는 LLM_PROVIDER 값은 throw', async () => {
  await withEnv({ LLM_PROVIDER: 'openai', NODE_ENV: undefined }, async () => {
    await assert.rejects(() => pickFortuneLlm(), /LLM_PROVIDER 값이 올바르지 않습니다/);
    await assert.rejects(() => pickJudgeLlm(), /LLM_PROVIDER 값이 올바르지 않습니다/);
  });
});

test('NODE_ENV=production + LLM_PROVIDER=cli — 부팅 거부', async () => {
  await withEnv({ LLM_PROVIDER: 'cli', NODE_ENV: 'production' }, async () => {
    await assert.rejects(
      () => pickFortuneLlm(),
      /운영\(NODE_ENV=production\)에서 허용되지 않습니다/,
    );
    await assert.rejects(() => pickJudgeLlm(), /운영\(NODE_ENV=production\)에서 허용되지 않습니다/);
  });
});

test('describeProvider — api 모드 정보 포함', () => {
  // 동기. dev 환경에선 SDK 미설치라 실제 pick은 못 하지만 describe는 의존성 로드 없음.
  return withEnv(
    { LLM_PROVIDER: 'api', NODE_ENV: 'production', FORTUNE_MODEL: 'claude-sonnet-4-6' },
    () => {
      const info = describeProvider();
      assert.equal(info.provider, 'api');
      assert.equal(info.nodeEnv, 'production');
      assert.match(info.note, /Anthropic SDK/);
      assert.match(info.note, /claude-sonnet-4-6/);
    },
  );
});

test('describeProvider — cli 모드 정보 포함', () =>
  withEnv({ LLM_PROVIDER: 'cli', NODE_ENV: undefined }, () => {
    const info = describeProvider();
    assert.equal(info.provider, 'cli');
    assert.match(info.note, /local claude -p/);
    assert.match(info.note, /dev 전용/);
  }));

test('describeProvider — nodeEnv 미설정 시 "(unset)"', () =>
  withEnv({ LLM_PROVIDER: 'api', NODE_ENV: undefined }, () => {
    assert.equal(describeProvider().nodeEnv, '(unset)');
  }));

test('describeProvider — 잘못된 LLM_PROVIDER 값은 throw', () =>
  withEnv({ LLM_PROVIDER: 'gemini', NODE_ENV: undefined }, () => {
    assert.throws(() => describeProvider(), /LLM_PROVIDER 값이 올바르지 않습니다/);
  }));

// api 모드 + 정상 SDK 로드는 dev 환경에 @anthropic-ai/sdk가 설치돼 있을 때만 의미.
// 설치 여부에 따라 동작이 갈리므로 별도 통합 테스트(deploy 검증 단계)로 미룬다.
