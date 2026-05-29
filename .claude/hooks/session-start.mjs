#!/usr/bin/env node
// SessionStart hook — installs oh-my-claudecode (omc) on every new remote session.
// Using .mjs avoids bash/sh OS-compatibility issues (Windows, Alpine, etc.).

import { spawnSync } from 'node:child_process';

// Only run in remote (Claude Code on the web) environments
if (process.env.CLAUDE_CODE_REMOTE !== 'true') {
  process.exit(0);
}

// Signal async mode: session starts immediately while install runs in background
process.stdout.write(JSON.stringify({ async: true, asyncTimeout: 300000 }) + '\n');

function run(cmd, args, extraArgs = []) {
  const result = spawnSync(cmd, [...args, ...extraArgs], { stdio: 'inherit' });
  return result.status === 0;
}

// 1. Install oh-my-claudecode CLI globally (published as oh-my-claude-sisyphus)
//    Try offline-first for speed, fall back to full network fetch
if (!run('npm', ['i', '-g', 'oh-my-claude-sisyphus@latest'], ['--prefer-offline'])) {
  if (!run('npm', ['i', '-g', 'oh-my-claude-sisyphus@latest'])) {
    process.stderr.write('oh-my-claudecode install failed\n');
    process.exit(1);
  }
}

// 2. Sync agents, skills, hooks into ~/.claude/
//    --no-plugin: use bundled skills from the npm package
//    --quiet: suppress verbose output
if (!run('omc', ['setup', '--no-plugin', '--quiet'])) {
  process.stderr.write('omc setup failed\n');
  process.exit(1);
}
