// Refactor safety net: snapshot what every public page says and links to, then diff two snapshots.
//   node scripts/snapshot.mjs take <name>            (BASE=http://localhost:3000, SAMPLE=60 for a random subset)
//   node scripts/snapshot.mjs diff <before> <after>
//   RESOLVE=89.116.24.123 BASE=https://hlyna.com.ua node scripts/snapshot.mjs take prod-before
// Per page it stores: title, meta description, canonical, Open Graph, JSON-LD (parsed), visible text of <main>,
// internal links, heading outline, a tag-structure signature of <main> and a class signature (markup/visual drift).
// Output: .snapshots/<name>.json (gitignored). The diff prints counts per category and the first examples.
import crypto from 'node:crypto'
import dns from 'node:dns'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { JSDOM } from 'jsdom'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const host = new URL(BASE).hostname
const lookup = (h, o, cb) =>
  process.env.RESOLVE && h === host ? (o?.all ? cb(null, [{ address: process.env.RESOLVE, family: 4 }]) : cb(null, process.env.RESOLVE, 4)) : dns.lookup(h, o, cb)
const DIR = '.snapshots'
const EXTRA = ['/mapa', '/zapyt', '/kabinet/vhid', '/sertyfikaty-neisnuyucha-storinka-404']

function get(url) {
  const lib = url.startsWith('https:') ? https : http
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { lookup, headers: { 'user-agent': 'hlyna-snapshot' }, timeout: 120000 }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12)
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

// Values that legitimately change between runs (build ids, timestamps) are blanked before comparing.
const VOLATILE_KEYS = new Set(['dateModified'])
function stable(v) {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, VOLATILE_KEYS.has(k) ? '~' : stable(v[k])]))
  return v
}

function structure(el, depth = 0) {
  if (!el || depth > 40) return ''
  const kids = [...el.children].filter((c) => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(c.tagName))
  return el.tagName.toLowerCase() + (kids.length ? '(' + kids.map((k) => structure(k, depth + 1)).join(',') + ')' : '')
}

function extract(html) {
  const { document } = new JSDOM(html).window
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null
  const og = {}
  for (const m of document.querySelectorAll('meta[property^="og:"]')) {
    const k = m.getAttribute('property')
    if (k === 'og:image') og[k] = (m.getAttribute('content') ?? '').replace(/^https?:\/\/[^/]+/, '')
    else og[k] = m.getAttribute('content')
  }
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => { try { return stable(JSON.parse(s.textContent)) } catch { return 'INVALID' } })
    .map((x) => JSON.stringify(x))
    .sort()
  const main = document.querySelector('main') ?? document.body
  for (const s of main.querySelectorAll('script,style,template,noscript')) s.remove()
  const links = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('/') && !h.startsWith('//')))].sort()
  const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName}:${norm(h.textContent)}`)
  const classes = [...main.querySelectorAll('[class]')].map((e) => e.getAttribute('class')).join('|')
  return {
    title: norm(document.title),
    description: meta('meta[name="description"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    og,
    jsonld,
    text: norm(main.textContent),
    links,
    headings,
    structure: hash(structure(main)),
    classes: hash(classes),
  }
}

async function urls() {
  const { body } = await get(BASE + '/catalog-sitemap.xml')
  const list = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  let all = [...new Set([...list, ...EXTRA])]
  if (process.env.SAMPLE) {
    // Deterministic sample so before/after runs compare the same pages.
    all = all.sort((a, b) => hash(a).localeCompare(hash(b))).slice(0, Number(process.env.SAMPLE))
    for (const x of EXTRA) if (!all.includes(x)) all.push(x)
  }
  if (process.env.ONLY) all = all.filter((u) => new RegExp(process.env.ONLY).test(u))
  return all
}

async function take(name) {
  const list = await urls()
  const out = {}
  let i = 0
  const worker = async () => {
    while (i < list.length) {
      const u = list[i++]
      // Retries cover a dev server restarting under memory pressure mid-run.
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const r = await get(BASE + encodeURI(u))
          if (r.status >= 500 && attempt < 4) throw new Error('status ' + r.status)
          out[u] = { status: r.status, bytes: Buffer.byteLength(r.body), ...(r.status < 500 ? extract(r.body) : {}) }
          break
        } catch (e) {
          out[u] = { status: 0, error: String(e).slice(0, 120) }
          await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)))
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Number(process.env.CONCURRENCY || 4) }, worker))
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(`${DIR}/${name}.json`, JSON.stringify(out))
  const bad = Object.entries(out).filter(([, v]) => v.status !== 200)
  console.log(`${name}: ${list.length} pages, non-200: ${bad.length}`, bad.slice(0, 5).map(([u, v]) => `${u} ${v.status}`).join('; '))
}

function diff(a, b) {
  const A = JSON.parse(fs.readFileSync(`${DIR}/${a}.json`, 'utf8'))
  const B = JSON.parse(fs.readFileSync(`${DIR}/${b}.json`, 'utf8'))
  const keys = ['status', 'title', 'description', 'canonical', 'og', 'jsonld', 'text', 'links', 'headings', 'structure', 'classes']
  const report = Object.fromEntries(keys.map((k) => [k, []]))
  const only = { a: Object.keys(A).filter((u) => !(u in B)), b: Object.keys(B).filter((u) => !(u in A)) }
  for (const u of Object.keys(A)) {
    if (!(u in B)) continue
    for (const k of keys) {
      const x = JSON.stringify(A[u][k]), y = JSON.stringify(B[u][k])
      if (x !== y) report[k].push({ u, x, y })
    }
  }
  console.log(`pages: ${Object.keys(A).length} → ${Object.keys(B).length}; only in ${a}: ${only.a.length}; only in ${b}: ${only.b.length}`)
  if (only.a.length) console.log('  only before:', only.a.slice(0, 10).join(' '))
  if (only.b.length) console.log('  only after:', only.b.slice(0, 10).join(' '))
  const show = Number(process.env.SHOW || 3)
  for (const k of keys) {
    console.log(`${k}: ${report[k].length} pages differ`)
    for (const d of report[k].slice(0, show)) {
      if (k === 'text') {
        // Show the first differing window of text.
        const x = d.x ? JSON.parse(d.x) ?? '' : '', y = d.y ? JSON.parse(d.y) ?? '' : ''
        let i = 0
        while (i < x.length && x[i] === y[i]) i++
        console.log(`  ${d.u}\n    - …${x.slice(Math.max(0, i - 60), i + 120)}\n    + …${y.slice(Math.max(0, i - 60), i + 120)}`)
      } else console.log(`  ${d.u}\n    - ${d.x?.slice(0, 300)}\n    + ${d.y?.slice(0, 300)}`)
    }
  }
}

const [cmd, a, b] = process.argv.slice(2)
if (cmd === 'take') await take(a || 'snap')
else if (cmd === 'diff') diff(a, b)
else console.log('usage: snapshot.mjs take <name> | diff <a> <b>')
