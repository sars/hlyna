import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { desc } from 'drizzle-orm'

import type { Db } from '../db'
import { importRuns } from '../db/schema/history'

// Read-only status of the Instagram refresh for the panel. Today the scanner runs on the radar server and the hourly
// job syncs its files to Rodion's Mac (09_instagram/posts_scan); IG_STATUS_DIR points there. In production the server
// can't see those files: the hourly job must upload a small status JSON (or write import_runs) — see the docs.

export const IG_DIR = () => process.env.IG_STATUS_DIR ?? path.resolve(process.cwd(), '../UkraineCeramics/09_instagram/posts_scan')

async function text(file: string) {
  try {
    return await readFile(path.join(IG_DIR(), file), 'utf8')
  } catch {
    return null
  }
}
async function mtime(file: string) {
  try {
    return (await stat(path.join(IG_DIR(), file))).mtime.toISOString()
  } catch {
    return null
  }
}
const lines = (t: string | null) => (t ? t.split('\n').filter((l) => l.trim()) : [])
function jsonl(t: string | null) {
  const out: Record<string, unknown>[] = []
  for (const l of lines(t)) {
    try {
      out.push(JSON.parse(l))
    } catch {
      // a half-written line while the scanner appends: skip it
    }
  }
  return out
}

/** One line «<ISO time> <message>» → when and what. */
function statusLine(t: string | null) {
  const s = t?.trim()
  if (!s) return null
  const [at, ...rest] = s.split(' ')
  return { at: Number.isNaN(Date.parse(at!)) ? null : at!, message: Number.isNaN(Date.parse(at!)) ? s : rest.join(' ') }
}

/** Status computed from the scanner's files (posts, highlights, notes, logs). */
export async function instagramFileStatus() {
  const [posts, postsDone, hl, hlDone, notes, extract, st, stHl, scanLog, hlLog, stopped, stoppedHl] = await Promise.all([
    text('entries_ig_posts.jsonl'),
    text('posts_done.txt'),
    text('highlights.jsonl'),
    text('highlights_done.txt'),
    text('ig_notes.jsonl'),
    text('hl_extract.jsonl'),
    text('STATUS'),
    text('STATUS_HL'),
    text('scan.log'),
    text('scan_hl.log'),
    text('STOPPED'),
    text('STOPPED_HL'),
  ])
  const postRows = jsonl(posts)
  const statusCounts = (rows: Record<string, unknown>[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      const k = String(r.status ?? 'unknown')
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
  return {
    dir: IG_DIR(),
    reachable: posts !== null || st !== null,
    lastSync: await mtime('entries_ig_posts.jsonl'),
    posts: { status: statusLine(st), stopped: stopped?.trim() || null, done: lines(postsDone).length, entries: postRows.length, byStatus: statusCounts(postRows), notes: lines(notes).length },
    highlights: { status: statusLine(stHl), stopped: stoppedHl?.trim() || null, done: lines(hlDone).length, entries: jsonl(hl).length, extracted: lines(extract).length },
    recentLog: [...lines(scanLog).slice(-8), ...lines(hlLog).slice(-8)].sort().slice(-12).reverse(),
  }
}
export type InstagramFileStatus = Awaited<ReturnType<typeof instagramFileStatus>>

/**
 * In production the server can't see the scanner's files: the hourly job uploads ig-status.json (made by
 * scripts/app/ig-status-json.ts, same shape as instagramFileStatus) into IG_STATUS_DIR. If it's there, use it.
 */
export async function instagramStatus(db: Db) {
  const uploaded = await text('ig-status.json')
  let files: InstagramFileStatus
  try {
    files = uploaded ? { ...(JSON.parse(uploaded) as InstagramFileStatus), dir: IG_DIR() } : await instagramFileStatus()
  } catch {
    files = await instagramFileStatus()
  }
  const runs = await db.select().from(importRuns).orderBy(desc(importRuns.startedAt)).limit(20).catch(() => [])
  return { ...files, runs }
}
