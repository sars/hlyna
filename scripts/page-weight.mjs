// Page weight: HTML and JS per page (raw and gzip), from any base URL.
//   BASE=https://hlyna.com.ua RESOLVE=89.116.24.123 node scripts/page-weight.mjs / /vyrobnyky/katartsys …
import dns from 'node:dns'
import https from 'node:https'
import http from 'node:http'
import zlib from 'node:zlib'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const host = new URL(BASE).hostname
const lookup = (h, o, cb) =>
  process.env.RESOLVE && h === host ? (o?.all ? cb(null, [{ address: process.env.RESOLVE, family: 4 }]) : cb(null, process.env.RESOLVE, 4)) : dns.lookup(h, o, cb)
const get = (url) =>
  new Promise((resolve, reject) => {
    ;(url.startsWith('https:') ? https : http)
      .get(url, { lookup, headers: { 'user-agent': 'hlyna-weight' } }, (res) => {
        const c = []
        res.on('data', (d) => c.push(d))
        res.on('end', () => resolve(Buffer.concat(c)))
      })
      .on('error', reject)
  })
const kb = (n) => (n / 1024).toFixed(0)

const pages = process.argv.slice(2)
const cache = new Map()
console.log('page\thtml\thtml.gz\tjs\tjs.gz\tchunks')
for (const p of pages) {
  const html = await get(BASE + p)
  const srcs = [...new Set([...html.toString().matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))]
  let js = 0, jsgz = 0
  for (const s of srcs) {
    const url = s.startsWith('http') ? s : BASE + s
    if (!cache.has(url)) cache.set(url, await get(url))
    const b = cache.get(url)
    js += b.length
    jsgz += zlib.gzipSync(b).length
  }
  console.log(`${p}\t${kb(html.length)}\t${kb(zlib.gzipSync(html).length)}\t${kb(js)}\t${kb(jsgz)}\t${srcs.length}`)
}
