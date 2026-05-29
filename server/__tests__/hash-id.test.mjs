import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashIdentifier, assertPrivacyReady, _resetPrivacyWarnings } from '../src/util/hash-id.mjs';

// env 격리 — 다른 테스트에 영향 없도록 매번 복원.
async function withEnv(overrides, fn) {
  const orig = {};
  for (const k of Object.keys(overrides)) orig[k] = process.env[k];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetPrivacyWarnings();
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(orig)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    _resetPrivacyWarnings();
  }
}

test('출력은 64자 lowercase hex', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    const out = hashIdentifier('1.2.3.4');
    assert.match(out, /^[0-9a-f]{64}$/);
  });
});

test('같은 입력 → 같은 해시 (결정적)', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.equal(hashIdentifier('a'), hashIdentifier('a'));
  });
});

test('다른 입력 → 다른 해시', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.notEqual(hashIdentifier('a'), hashIdentifier('b'));
  });
});

test('namespace 다르면 같은 값이라도 다른 해시', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.notEqual(hashIdentifier('1.2.3.4', 'rate-limit'), hashIdentifier('1.2.3.4', 'replay'));
  });
});

test('PRIVACY_HMAC_SECRET 있으면 SHA-256과 다른 해시 (HMAC 분기)', async () => {
  const value = 'test-value';
  let withoutSecret;
  let withSecret;
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    withoutSecret = hashIdentifier(value);
  });
  await withEnv({ PRIVACY_HMAC_SECRET: 'a'.repeat(64) }, () => {
    withSecret = hashIdentifier(value);
  });
  assert.notEqual(withoutSecret, withSecret);
  assert.match(withSecret, /^[0-9a-f]{64}$/);
});

test('PRIVACY_HMAC_SECRET 같으면 결정적', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: 'shared-secret' }, () => {
    assert.equal(hashIdentifier('x'), hashIdentifier('x'));
  });
});

test('PRIVACY_HMAC_SECRET 다르면 다른 해시', async () => {
  let h1, h2;
  await withEnv({ PRIVACY_HMAC_SECRET: 'secret-1' }, () => {
    h1 = hashIdentifier('same');
  });
  await withEnv({ PRIVACY_HMAC_SECRET: 'secret-2' }, () => {
    h2 = hashIdentifier('same');
  });
  assert.notEqual(h1, h2);
});

test('숫자/undefined/null도 안전하게 문자열 변환', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.equal(hashIdentifier(123), hashIdentifier('123'));
    assert.match(hashIdentifier(undefined), /^[0-9a-f]{64}$/);
    assert.match(hashIdentifier(null), /^[0-9a-f]{64}$/);
  });
});

test('namespace separator는 항상 적용 (빈 namespace 충돌 방지)', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    // hashIdentifier('a\0b','') 와 hashIdentifier('b','a') 가 다른 해시가 되도록.
    const empty = hashIdentifier('a\0b', '');
    const withNs = hashIdentifier('b', 'a');
    assert.notEqual(empty, withNs);
  });
});

test('assertPrivacyReady: NODE_ENV=production + 시크릿 없으면 throw', async () => {
  await withEnv({ NODE_ENV: 'production', PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.throws(() => assertPrivacyReady(), /운영\(NODE_ENV=production\)에서 반드시 필요/);
  });
});

test('assertPrivacyReady: production + 시크릿 있으면 통과', async () => {
  await withEnv({ NODE_ENV: 'production', PRIVACY_HMAC_SECRET: 'a'.repeat(64) }, () => {
    assert.doesNotThrow(() => assertPrivacyReady());
  });
});

test('assertPrivacyReady: dev에서 시크릿 없어도 통과 (경고만)', async () => {
  await withEnv({ NODE_ENV: undefined, PRIVACY_HMAC_SECRET: undefined }, () => {
    assert.doesNotThrow(() => assertPrivacyReady());
  });
});

test('assertPrivacyReady: 짧은 시크릿(<32자)이면 경고', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: 'short' }, () => {
    const orig = console.warn;
    const calls = [];
    console.warn = (...a) => calls.push(a);
    try {
      assertPrivacyReady();
    } finally {
      console.warn = orig;
    }
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /32자 이상 권장/);
  });
});

test('SHA-256 폴백 시 부팅 경고는 1회만', async () => {
  await withEnv({ PRIVACY_HMAC_SECRET: undefined }, () => {
    const orig = console.warn;
    const calls = [];
    console.warn = (...a) => calls.push(a);
    try {
      hashIdentifier('a');
      hashIdentifier('b');
      hashIdentifier('c');
    } finally {
      console.warn = orig;
    }
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /PRIVACY_HMAC_SECRET 미설정/);
  });
});
