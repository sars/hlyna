#!/usr/bin/env node
// PreToolUse(Bash): blocks only clearly destructive commands. Exit 2 = block,
// stderr is shown to Claude. Everything else passes.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const cmd = String(input.tool_input?.command ?? '');

// rm -rf is fine only for rebuildable folders.
const DISPOSABLE = /^(?:\.\/)?(?:node_modules|\.next|\.shots|test-results|playwright-report)(?:\/.*)?$/;

function checkRm(segment) {
  const words = segment.trim().replace(/["']/g, '').split(/\s+/);
  const at = words.findIndex((w) => w === 'rm' || w.endsWith('/rm'));
  if (at === -1) return null;
  const args = words.slice(at + 1);
  const flags = args.filter((w) => w.startsWith('-')).join('');
  if (!/r/i.test(flags) || !/f/.test(flags)) return null;
  const targets = args.filter((w) => !w.startsWith('-'));
  const risky = targets.filter((t) => !DISPOSABLE.test(t));
  if (!targets.length || risky.length) {
    return `rm -rf ${risky.join(' ') || '(no target)'}: only node_modules, .next, .shots may be force-deleted. Move it aside or ask the owner.`;
  }
  return null;
}

const RULES = [
  [/\bgit\s+reset\s+(?:\S+\s+)*--hard\b/, '`git reset --hard` discards uncommitted work. Use `git stash` or `git restore <file>`.'],
  [/\bgit\s+push\b[^|;&]*(?:\s--force\b|\s--force-with-lease\b|\s-[a-zA-Z]*f\b|\s\+\S)/, 'Force push overwrites the remote. Push normally or ask the owner.'],
  [/\bdocker[\s-]compose\b[^|;&]*\bdown\b[^|;&]*(?:\s-v\b|\s--volumes\b|\s-[a-zA-Z]*v[a-zA-Z]*\b)/, '`docker compose down -v` deletes the database volume. Use `down` without -v or `restart`.'],
  [/(?:^|[\s;&|(])dropdb\b/, '`dropdb` deletes a database. Ask the owner.'],
  [/\bDROP\s+(?:DATABASE|SCHEMA)\b/i, 'DROP DATABASE/SCHEMA deletes data. Ask the owner.'],
];

let problem = null;
for (const [re, msg] of RULES) if (re.test(cmd)) { problem = msg; break; }
if (!problem) {
  for (const seg of cmd.split(/&&|\|\||[;|\n]|\$\(|`/)) {
    problem = checkRm(seg);
    if (problem) break;
  }
}
if (problem) {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${problem}\n`);
  process.exit(2);
}
