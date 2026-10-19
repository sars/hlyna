// Copy reviewed wave B page copy from the research folder into the repo and validate it.
//   node scripts/sync-wave-b.mjs            (SRC=/path/to/_site_content/waveB to override)
// Reads <SRC>/copy/<id>.json (format: <SRC>/COPY_FORMAT.md), writes src/content/waveB/<id>.json and
// src/content/waveB/index.ts (static imports, so copy ships inside the build). Only ids listed in
// <SRC>/INDEX.json are accepted. A page is published as soon as its copy is here (and its data qualifies).
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.env.SRC || '/Users/rodik/Claude/UkraineCeramics/_site_content/waveB'
const OUT = path.resolve('src/content/waveB')
const index = JSON.parse(fs.readFileSync(path.join(SRC, 'INDEX.json'), 'utf8'))
const known = new Set(index.pages.map((p) => p.id))
const published = (() => {
  try {
    return new Set(JSON.parse(fs.readFileSync(path.join(SRC, '..', 'public_studios.json'), 'utf8')).map((s) => s.slug))
  } catch {
    return null
  }
})()

const str = (v) => typeof v === 'string' && v.trim().length > 0
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
// Placeholders a page may use: the keys of its data pack's "placeholders" (INDEX.json lists them per page).
const placeholdersOf = new Map(index.pages.map((p) => [p.id, new Set(p.placeholders ?? [])]))
let problems = 0
const warn = (f, m) => {
  problems++
  console.warn(`${f}: ${m}`)
}

const dir = path.join(SRC, 'copy')
const ids = []
// The copies now in the repo, read before they are cleared: an unchanged page keeps its `updated` date.
const before = new Map()
for (const old of fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && f !== 'events.json' && f !== 'museums.json')) {
  try { before.set(old.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(OUT, old), 'utf8'))) } catch {}
  fs.unlinkSync(path.join(OUT, old))
}
for (const file of fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []) {
  const id = file.replace(/\.json$/, '')
  if (!known.has(id)) {
    warn(file, 'id not in INDEX.json, skipped')
    continue
  }
  let d
  try {
    d = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  } catch (e) {
    warn(file, `invalid JSON (${e.message}), skipped`)
    continue
  }
  const out = {
    id,
    title: str(d.title) ? d.title.trim() : '',
    metaDescription: str(d.metaDescription) ? d.metaDescription.trim() : '',
    lead: str(d.lead) ? d.lead.trim() : '',
    epigraph: (Array.isArray(d.epigraph) ? d.epigraph : []).filter(str).map((s) => s.trim()),
    sections: (Array.isArray(d.sections) ? d.sections : [])
      .filter((s) => s && str(s.heading))
      .map((s) => ({
        heading: s.heading.trim(),
        paragraphs: (Array.isArray(s.paragraphs) ? s.paragraphs : []).filter(str).map((p) => p.trim()),
        ...(Array.isArray(s.bullets) && s.bullets.some(str) ? { bullets: s.bullets.filter(str).map((b) => b.trim()) } : {}),
      })),
    picks: (Array.isArray(d.picks) ? d.picks : [])
      .filter((p) => p && str(p.need) && Array.isArray(p.slugs) && p.slugs.length)
      .map((p) => ({ need: p.need.trim(), slugs: p.slugs.filter(str), why: str(p.why) ? p.why.trim() : '' })),
    ...(Array.isArray(d.tops) && d.tops.length
      ? {
          tops: d.tops
            .filter((c) => c && str(c.id) && str(c.heading) && Array.isArray(c.items))
            .map((c) => ({
              id: c.id.trim(),
              heading: c.heading.trim(),
              ...(str(c.intro) ? { intro: c.intro.trim() } : {}),
              items: c.items
                .filter((x) => x && str(x.title) && str(x.maker) && str(x.details) && str(x.seen))
                .map((x) => ({
                  ...Object.fromEntries(['title', 'maker', 'slug', 'href', 'city', 'price', 'details', 'terms', 'seen', 'embed'].filter((k) => str(x[k])).map((k) => [k, x[k].trim()])),
                  // The studio's own photos (sha256 prefixes of uploaded media, TopItem.photos).
                  ...(Array.isArray(x.photos) && x.photos.some(str) ? { photos: x.photos.filter(str).map((h) => h.trim()) } : {}),
                })),
            }))
            .filter((c) => c.items.length),
        }
      : {}),
    faq: (Array.isArray(d.faq) ? d.faq : []).filter((x) => x && str(x.q) && str(x.a)).map((x) => ({ q: x.q.trim(), a: x.a.trim() })),
    sources: [...new Set((Array.isArray(d.sources) ? d.sources : []).filter((s) => str(s) && /^https?:\/\//.test(s)))],
  }
  if (!out.title || !out.lead) {
    warn(file, 'no title or lead, skipped')
    continue
  }
  if (out.epigraph.length > 6) warn(file, 'epigraph longer than 6 lines')
  for (const c of out.tops ?? []) {
    if (c.items.length > 5) warn(file, `top «${c.heading}» has ${c.items.length} items (5 at most)`)
    for (const x of c.items) {
      if (x.href && !/^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(x.href)) warn(file, `top item «${x.title}»: href must be an Instagram profile URL`)
      if (x.embed && !/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/$/.test(x.embed)) warn(file, `top item «${x.title}»: embed must be an Instagram post URL`)
      if (x.slug && x.href) warn(file, `top item «${x.title}»: slug and href both set (slug wins)`)
      if (x.photos?.some((h) => !/^[0-9a-f]{12,64}$/.test(h))) warn(file, `top item «${x.title}»: photos must be sha256 prefixes (12+ hex)`)
    }
  }
  const all = JSON.stringify(out)
  for (const m of all.matchAll(/\{(\w+)\}/g)) if (!placeholdersOf.get(id)?.has(m[1])) warn(file, `unknown placeholder {${m[1]}}`)
  if (published) {
    const linked = [...all.matchAll(LINK)].map((m) => m[2]).filter((s) => !s.startsWith('/'))
    for (const s of [...linked, ...out.picks.flatMap((p) => p.slugs), ...(out.tops ?? []).flatMap((c) => c.items.map((x) => x.slug).filter(Boolean))]) if (!published.has(s)) warn(file, `unknown studio slug "${s}" (renders as plain text)`)
  }
  // `updated` (the page's lastmod in the sitemap): today in Kyiv when the copy differs from what is in the repo,
  // else the date the repo file already carries; a date written in the research copy wins.
  const dst = path.join(OUT, `${id}.json`)
  const prev = before.get(id) ?? null
  const same = prev && JSON.stringify({ ...prev, updated: undefined }) === JSON.stringify({ ...out, updated: undefined })
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Kyiv' }).format(new Date())
  out.updated = /^\d{4}-\d{2}-\d{2}$/.test(d.updated ?? '') ? d.updated : same && prev.updated ? prev.updated : same ? undefined : today
  if (!out.updated) delete out.updated
  fs.writeFileSync(dst, JSON.stringify(out, null, 1) + '\n')
  ids.push(id)
}

const v = (id) => `c_${id.replace(/[^a-z0-9]/g, '_')}`
const lines = [
  '// Generated by scripts/sync-wave-b.mjs — do not edit by hand.',
  "import type { WaveCopy } from '@/editorial/copy'",
  '',
  ...ids.map((id) => `import ${v(id)} from './${id}.json'`),
  '',
  `export const copies: Record<string, WaveCopy> = {\n${ids.map((id) => `  '${id}': ${v(id)},`).join('\n')}\n}`,
  '',
]
fs.writeFileSync(path.join(OUT, 'index.ts'), lines.join('\n'))
// Just the ids, for navigation (a client module must not pull every copy into the browser bundle).
fs.writeFileSync(path.join(OUT, 'live.ts'), `// Generated by scripts/sync-wave-b.mjs — do not edit by hand.\nexport const liveWaveBIds: string[] = ${JSON.stringify(ids)}\n`)
console.log(`copies ${ids.length}, warnings ${problems}`)
