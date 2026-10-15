// Studio links in editorial copy must point at published studios. The renderer drops an unknown slug silently
// (a link turns into plain text, a pick vanishes and its «why» lands under the next name). deploy/push.sh runs it
// against production before every deploy; by hand:
//   DATABASE_URL=… pnpm exec tsx scripts/app/check-content-slugs.ts     (read-only; exit 1 on any unknown slug)
// Checked: markdown links «[label](slug)», "slugs": [...] lists and "slug": "…" values in src/content and src/editorial.
// Not studio slugs and skipped: a file's own slug, city slugs, product page slugs, links that start with «/» or «http».
import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'

import { guard } from './_guard'
import { db, pool } from '../../src/server/db'
import { cities, studios } from '../../src/server/db/schema/catalog'

guard('check-content-slugs')
const published = new Set((await db.select({ slug: studios.slug }).from(studios).where(eq(studios.visibility, 'public'))).map((r) => r.slug))
const citySlugs = new Set((await db.select({ slug: cities.slug }).from(cities)).map((r) => r.slug))

const files: string[] = []
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/\.(json|ts)$/.test(f)) files.push(p)
  }
}
walk('src/content')
walk('src/editorial')

const productPages = new Set([...fs.readFileSync('src/content/topics/products.ts', 'utf8').matchAll(/\/vyrobnyky\/vyrib\/([a-z0-9-]+)/g)].map((m) => m[1]))
const refs = (text: string): string[] => [
  ...[...text.matchAll(/\]\(([a-z0-9]+(?:-[a-z0-9]+)*)\)/g)].map((m) => m[1]),
  ...[...text.matchAll(/"slugs"\s*:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1])),
  ...[...text.matchAll(/"slug"\s*:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]),
]

const unknown: string[] = []
for (const file of files) {
  const own = path.basename(file).replace(/\.(json|ts)$/, '')
  for (const slug of new Set(refs(fs.readFileSync(file, 'utf8')))) {
    if (published.has(slug) || slug === own || citySlugs.has(slug) || productPages.has(slug)) continue
    if (file.includes('/cases/') && own.startsWith(slug.slice(0, 12))) continue // a case's own slug
    unknown.push(`${file}: ${slug}`)
  }
}

unknown.forEach((u) => console.log('unknown studio slug', u))
console.log(`${files.length} files, ${published.size} published studios, ${unknown.length} unknown slugs`)
await pool.end()
process.exit(unknown.length ? 1 : 0)
