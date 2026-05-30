#!/usr/bin/env node
// SessionStart hook — prepares a remote (Claude Code on the web) session.
//   1. Installs project dependencies (root + server) so `node --test`,
//      eslint, prettier and tsc work during the session.
//   2. Installs oh-my-claudecode (omc) and syncs its agents/skills/hooks.
// Using .mjs avoids bash/sh OS-compatibility issues (Windows, Alpine, etc.).

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Only run in remote (Claude Code on the web) environments
if (process.env.CLAUDE_CODE_REMOTE !== 'true') {
  process.exit(0);
}

// Signal async mode: session starts immediately while install runs in background
process.stdout.write(JSON.stringify({ async: true, asyncTimeout: 300000 }) + '\n');

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function run(cmd, args, extraArgs = []) {
  const result = spawnSync(cmd, [...args, ...extraArgs], { stdio: 'inherit' });
  return result.status === 0;
}

// 1. Install project dependencies (idempotent; container state is cached after
//    the hook completes, so re-runs are fast "up to date" no-ops).
//    Root carries the lint/format/typecheck toolchain + RN deps; server carries
//    its own runtime deps. Failures are logged but do not abort the session.
const npmInstall = ['install', '--no-audit', '--no-fund'];
if (!run('npm', ['--prefix', projectDir, ...npmInstall])) {
  process.stderr.write('root dependency install failed\n');
}
if (!run('npm', ['--prefix', join(projectDir, 'server'), ...npmInstall])) {
  process.stderr.write('server dependency install failed\n');
}

// 2. Install oh-my-claudecode CLI globally (published as oh-my-claude-sisyphus)
//    Try offline-first for speed, fall back to full network fetch
if (!run('npm', ['i', '-g', 'oh-my-claude-sisyphus@latest'], ['--prefer-offline'])) {
  if (!run('npm', ['i', '-g', 'oh-my-claude-sisyphus@latest'])) {
    process.stderr.write('oh-my-claudecode install failed\n');
    process.exit(1);
  }
}

// 3. Sync agents, skills, hooks into ~/.claude/
//    --no-plugin: use bundled skills from the npm package
//    --quiet: suppress verbose output
if (!run('omc', ['setup', '--no-plugin', '--quiet'])) {
  process.stderr.write('omc setup failed\n');
  process.exit(1);
}
