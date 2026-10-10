// Crawl the site from / and report internal links that don't answer 200 (plus pages that fail).
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
process.exit(bad.length ? 1 : 0)
