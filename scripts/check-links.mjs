// Crawl the site from / and report internal links that don't answer 200 (plus pages that fail), and page titles:
// longer than 70 characters is a warning (the target, src/lib/title.ts), longer than 100 or shared by two pages an error.
//   node scripts/check-links.mjs                      (http://localhost:3000)
//   BASE=https://hlyna.com.ua node scripts/check-links.mjs
//   RESOLVE=89.116.24.123 BASE=https://hlyna.com.ua …  (when local DNS is stale)
// Exit code 1 if anything is broken. Pages are fetched with a small concurrency limit.
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const LIMIT = Number(process.env.LIMIT || 2000)
const host = new URL(BASE).hostname
const lookup = (h, o, cb) =>
  process.env.RESOLVE && h === host ? (o?.all ? cb(null, [{ address: process.env.RESOLVE, family: 4 }]) : cb(null, process.env.RESOLVE, 4)) : dns.lookup(h, o, cb)

// GET without following redirects; returns { status, type, body }.
function get(url) {
  const lib = url.startsWith('https:') ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { lookup, headers: { 'user-agent': 'hlyna-link-check' }, timeout: 60000 }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] ?? '', body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

const TITLE_TARGET = 70
const TITLE_MAX = 100
const titles = new Map() // path → <title>
const seen = new Map() // path → status
const from = new Map() // path → first page that links to it
const queue = ['/']
from.set('/', '(start)')
const SKIP = /^\/(api|admin|_next|next|og|images|fonts|favicon|apple-touch|icon)/

async function visit(path) {
  let res
  try {
    res = await get(BASE + encodeURI(path))
  } catch (e) {
    seen.set(path, `ERR ${e.code ?? e.message}`)
    return
  }
  seen.set(path, res.status)
  if (res.status !== 200 || !res.type.includes('text/html')) return
  const html = res.body
  const t = html.match(/<title>([^<]*)<\/title>/)?.[1]
  if (t) titles.set(path, t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'"))
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    let href = m[1].replace(/&amp;/g, '&')
    if (href.startsWith(BASE)) href = href.slice(BASE.length) || '/'
    if (!href.startsWith('/') || href.startsWith('//')) continue
    const p = href.split('#')[0].split('?')[0] || '/'
    if (SKIP.test(p) || /\.(png|jpe?g|svg|ico|webp|avif|xml|txt|json|webmanifest)$/.test(p)) continue
    if (!from.has(p)) {
      from.set(p, path)
      queue.push(p)
    }
  }
}

while (queue.length && seen.size < LIMIT) {
  const batch = queue.splice(0, 8)
  await Promise.all(batch.map(visit))
}

const bad = [...seen].filter(([, st]) => st !== 200 && !(st >= 300 && st < 400))
console.log(`checked ${seen.size} pages on ${BASE}${queue.length ? ` (stopped at LIMIT, ${queue.length} queued)` : ''}`)
for (const [p, st] of bad) console.log(`  ${st}  ${p}   ← linked from ${from.get(p)}`)

const long = [...titles].filter(([, t]) => t.length > TITLE_TARGET).sort((a, b) => b[1].length - a[1].length)
const tooLong = long.filter(([, t]) => t.length > TITLE_MAX)
const byTitle = new Map()
for (const [p, t] of titles) byTitle.set(t, [...(byTitle.get(t) ?? []), p])
const dupes = [...byTitle].filter(([, ps]) => ps.length > 1)
console.log(`titles: ${titles.size}, over ${TITLE_TARGET}: ${long.length}, over ${TITLE_MAX}: ${tooLong.length}, shared: ${dupes.length}`)
for (const [p, t] of long) console.log(`  ${t.length > TITLE_MAX ? 'ERR ' : 'warn'} ${t.length}  ${p}  ${t}`)
for (const [t, ps] of dupes) console.log(`  ERR  same title on ${ps.join(', ')}: ${t}`)
process.exit(bad.length || tooLong.length || dupes.length ? 1 : 0)
