// Freeze a copy of the local database for refactor snapshots, so data imports running elsewhere don't show up as diffs.
//   node scripts/snapshot-db.mjs copy          → creates/refreshes database <name>_snap from DATABASE_URL (.env)
//   node scripts/snapshot-db.mjs dev 3200      → runs `next dev` on that port against the frozen copy
// The connection string is read from .env and never printed.
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]),
)
const src = new URL(env.DATABASE_URL)
const snapName = src.pathname.slice(1) + '_snap'
const snap = new URL(src); snap.pathname = '/' + snapName
const admin = new URL(src); admin.pathname = '/postgres'

const [cmd, port] = process.argv.slice(2)
if (cmd === 'copy') {
  const run = (c, e = {}) => execSync(c, { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, ...e } })
  run(`psql "$ADMIN" -c "DROP DATABASE IF EXISTS ${snapName} WITH (FORCE)" -c "CREATE DATABASE ${snapName}"`, { ADMIN: admin.href })
  run(`pg_dump --no-owner --no-privileges "$SRC" | psql -q "$DST"`, { SRC: src.href, DST: snap.href })
  console.log(`copied into ${snapName}`)
} else if (cmd === 'dev') {
  spawn('pnpm', ['exec', 'next', 'dev', '-p', port || '3200'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: snap.href, NODE_OPTIONS: '--no-deprecation --max-old-space-size=8192' } })
} else console.log('usage: snapshot-db.mjs copy | dev <port>')
