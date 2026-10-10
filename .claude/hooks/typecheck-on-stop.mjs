#!/usr/bin/env node
// Stop hook: if .ts/.tsx files changed in the working tree, run tsc and block
// the stop with the first 20 errors. Silent and instant when nothing changed.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
// Already blocked once in this stop cycle: let Claude stop to avoid loops.
if (input.stop_hook_active) process.exit(0);

const run = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
const changed = (run('git diff --name-only HEAD') + run('git ls-files --others --exclude-standard'))
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));
if (!changed.length) process.exit(0);

const r = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8', timeout: 170_000 });
if (r.status === 0) process.exit(0);
const lines = `${r.stdout}${r.stderr}`.split('\n').filter((l) => l.includes('error TS'));
if (!lines.length) process.exit(0); // tsc failed to start, not a type error: don't block
process.stderr.write(
  `TypeScript errors (${lines.length}) after your changes. Fix them before finishing:\n` +
    lines.slice(0, 20).join('\n') + '\n',
);
process.exit(2);
