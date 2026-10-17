// Studio field edits through the panel's editor (version check, revision, slug history with 301, audit):
//   EDITS=path pnpm exec tsx scripts/app/edit-studios.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "slug": "…", "why"?: "reason, printed with the change", "set"?: { "name"?, "shortName"?, "slug"?, "type"? (one of STUDIO_TYPES), "status"? (one of STUDIO_STATUSES),
//      "visibility"? ("public" | "hidden"), "address"?, "summary"?, "publicDescription"?, "recentNote"?, "descriptionInternal"?, "website"?, "instagram"?, "facebook"? ("" clears; otherwise an absolute http(s) URL), "city"? (a city slug) },
//      "replace"?: [["from", "to"], …], "dropFormats"?: ["courses", …], "addNames"?: ["…"], "dropNames"?: ["…"], "addSources"?: ["https://…"],
//      "clear"?: ["instagramPosts" (embedded posts), "activity" (last post date and followers: they came from an account that is not the profile's)], "mergeInto"?: "kept-slug",
//      "b2b"?: { "minOrder"?, "leadTime"? ("" clears), "logoMethods"?: ["…"], "worksWithHoreca"?, "worksWithCorporate"?, "foodSafe"?, "dishwasherSafe"? (true | false | null) } }]
//   replace runs over name, address, summary, publicDescription, recentNote, descriptionInternal; dropFormats removes format tags the profile does not support (tags
//   are added only through tag-studios proposals); addNames appends alternate names, dropNames removes wrong ones; addSources appends source links
//   (shown on the profile); a changed slug keeps the old one in app.studio_slug_history, which answers 308 (saveStudio does it; the run prints it);
//   mergeInto hides a duplicate and points its slug at the kept
//   public profile (the proxy answers its old URL with a redirect, docs/decisions.md 2026-10-15) — move any facts into the kept profile first;
//   a profile made public again (set.visibility "public", no mergeInto) that was merged earlier takes its slug back: the history row that sent
//   its own slug to the kept profile is deleted, so the URL answers 200 again;
//   b2b sets the terms for venues and companies (only facts with a source: the profile shows them and its badges rest on them).
import fs from 'node:fs'
import { and, eq, ne } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { cities, studios, studioSlugHistory } from '../../src/server/db/schema/catalog'
import { audit } from '../../src/server/services/audit'
import { STUDIO_STATUSES, STUDIO_TYPES, STUDIO_VISIBILITY } from '../../src/shared/options'
import { webUrl } from '../../src/lib/present'
import { getStudioForEdit, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { finishRun, scriptActor, startRun, writeStudio } from '../../src/server/services/imports/runs'

type Field = 'name' | 'shortName' | 'slug' | 'type' | 'status' | 'visibility' | 'address' | 'summary' | 'publicDescription' | 'recentNote' | 'descriptionInternal' | LinkField
type LinkField = 'website' | 'instagram' | 'facebook'
type B2b = { minOrder?: string; leadTime?: string; logoMethods?: string[]; worksWithHoreca?: boolean | null; worksWithCorporate?: boolean | null; foodSafe?: boolean | null; dishwasherSafe?: boolean | null }
type Edit = { slug: string; why?: string; set?: Partial<Record<Field | 'city', string>>; replace?: [string, string][]; dropFormats?: string[]; addNames?: string[]; dropNames?: string[]; addSources?: string[]; clear?: ('instagramPosts' | 'activity')[]; mergeInto?: string; b2b?: B2b }
// b2b keys → editor form fields.
const B2B = { minOrder: 'b2bMinOrder', leadTime: 'b2bLeadTime', logoMethods: 'b2bLogoMethods', worksWithHoreca: 'b2bWorksWithHoreca', worksWithCorporate: 'b2bWorksWithCorporate', foodSafe: 'b2bFoodSafe', dishwasherSafe: 'b2bDishwasherSafe' } as const

const { dry } = guard('edit-studios')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-edits.json', 'utf8')) as Edit[]
const TEXT: Exclude<Field, 'slug' | 'type' | 'status' | 'visibility' | LinkField>[] = ['name', 'address', 'summary', 'publicDescription', 'recentNote', 'descriptionInternal']
const LINKS: LinkField[] = ['website', 'instagram', 'facebook']
const actor = scriptActor('edit-studios')
const run = dry ? 0 : await startRun(db, 'edit-studios', `${edits.length} edits`)
let saved = 0
const missing: string[] = []

for (const e of edits) {
  // a slug the file renamed earlier is found by its old address, so the file can be re-run
  const [row] = (await db.select({ id: studios.id }).from(studios).where(eq(studios.slug, e.slug)).limit(1)).concat(
    e.mergeInto ? [] : await db.select({ id: studioSlugHistory.studioId }).from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, e.slug)).limit(1),
  )
  const s = row && (await getStudioForEdit(db, row.id))
  if (!row || !s) { missing.push(e.slug); continue }
  const form = toEditForm(s)
  for (const f of TEXT) {
    const v = form[f]
    // a replacement that extends its own text («… виставках.» → «… виставках. Студію веде …») is applied once
    if (typeof v === 'string') form[f] = (e.replace ?? []).reduce((acc, [a, b]) => (b.includes(a) && acc.includes(b) ? acc : acc.split(a).join(b)), v)
  }
  if (e.set?.type && !(STUDIO_TYPES as readonly string[]).includes(e.set.type)) throw new Error(`${e.slug}: unknown type ${e.set.type} (one of ${STUDIO_TYPES.join(', ')})`)
  if (e.set?.status && !(STUDIO_STATUSES as readonly string[]).includes(e.set.status)) throw new Error(`${e.slug}: unknown status ${e.set.status} (one of ${STUDIO_STATUSES.join(', ')})`)
  if (e.set?.visibility && !(STUDIO_VISIBILITY as readonly string[]).includes(e.set.visibility)) throw new Error(`${e.slug}: unknown visibility ${e.set.visibility}`)
  let into: { id: number; slug: string } | undefined
  if (e.mergeInto) {
    ;[into] = await db.select({ id: studios.id, slug: studios.slug }).from(studios).where(eq(studios.slug, e.mergeInto)).limit(1)
    if (!into || into.id === row.id) throw new Error(`${e.slug}: mergeInto ${e.mergeInto} is not another studio`)
    form.visibility = 'hidden'
  }
  for (const f of LINKS) {
    const v = e.set?.[f]
    if (v && webUrl(v) !== v) throw new Error(`${e.slug}: ${f} must be an absolute http(s) URL, got ${JSON.stringify(v)}`)
  }
  const { city, ...set } = e.set ?? {}
  Object.assign(form, set, ...LINKS.filter((f) => set[f] === '').map((f) => ({ [f]: null })))
  if (city) {
    const [c] = await db.select({ id: cities.id }).from(cities).where(eq(cities.slug, city)).limit(1)
    if (!c) throw new Error(`${e.slug}: unknown city ${city} (create it with edit-cities.ts first)`)
    form.cityId = c.id
  }
  const cityChanged = form.cityId !== toEditForm(s).cityId
  const dropped = (e.dropFormats ?? []).filter((f) => form.formats.includes(f as never))
  if (dropped.length) form.formats = form.formats.filter((f) => !dropped.includes(f))
  for (const [k, f] of Object.entries(e.b2b ?? {}) as [keyof B2b, B2b[keyof B2b]][]) {
    if (!(k in B2B)) throw new Error(`${e.slug}: unknown b2b field ${k} (one of ${Object.keys(B2B).join(', ')})`)
    Object.assign(form, { [B2B[k]]: f === '' ? null : f })
  }
  const b2bChanged = Object.values(B2B).filter((f) => JSON.stringify(form[f] ?? null) !== JSON.stringify(toEditForm(s)[f] ?? null))
  const names = (e.addNames ?? []).filter((n) => !form.alternateNames.includes(n))
  const droppedNames = (e.dropNames ?? []).filter((n) => form.alternateNames.includes(n))
  if (names.length || droppedNames.length) form.alternateNames = [...form.alternateNames.filter((n) => !droppedNames.includes(n)), ...names]
  const sources = (e.addSources ?? []).filter((u) => !form.sources.includes(u))
  for (const u of sources) if (webUrl(u) !== u) throw new Error(`${e.slug}: source must be an absolute http(s) URL, got ${JSON.stringify(u)}`)
  if (sources.length) form.sources = [...form.sources, ...sources]
  const clearPosts = (e.clear ?? []).includes('instagramPosts') && form.instagramPosts.length > 0
  if (clearPosts) form.instagramPosts = []
  const [act] = await db.select({ lastPost: studios.activityLastPostDate, followers: studios.activityFollowers }).from(studios).where(eq(studios.id, row.id)).limit(1)
  const clearActivity = (e.clear ?? []).includes('activity') && (act?.lastPost != null || act?.followers != null)
  const changed = (['slug', 'shortName', 'type', 'status', 'visibility', ...TEXT, ...LINKS] as Field[]).filter((f) => form[f] !== toEditForm(s)[f])
  const [history] = into ? await db.select({ studioId: studioSlugHistory.studioId }).from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, e.slug)).limit(1) : []
  const redirect = into && history?.studioId !== into.id
  // a merged profile made public again: its own slug must stop redirecting to the profile it was merged into
  const [merged] = !into && form.visibility === 'public' ? await db.select({ studioId: studioSlugHistory.studioId }).from(studioSlugHistory).where(and(eq(studioSlugHistory.oldSlug, form.slug ?? ''), ne(studioSlugHistory.studioId, row.id))).limit(1) : []
  const keptSlug = merged ? (await db.select({ slug: studios.slug }).from(studios).where(eq(studios.id, merged.studioId)).limit(1))[0]?.slug : undefined
  const lines = [
    ...changed.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f])?.slice(0, 80)} → ${JSON.stringify(form[f])?.slice(0, 80)}`),
    ...(cityChanged ? [`city: ${toEditForm(s).cityId} → ${city} (${form.cityId})`] : []),
    ...(dropped.length ? [`formats: −${dropped.join(', −')}`] : []),
    ...b2bChanged.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f] ?? null)} → ${JSON.stringify(form[f] ?? null)}`),
    ...(names.length ? [`names: +${names.join(', +')}`] : []),
    ...(droppedNames.length ? [`names: −${droppedNames.join(', −')}`] : []),
    ...(sources.length ? [`sources: +${sources.join(', +')}`] : []),
    ...(clearPosts ? ['instagramPosts: cleared'] : []),
    ...(clearActivity ? ['activity: last post date and followers cleared'] : []),
    ...(changed.includes('slug') ? [`slug history: /vyrobnyky/${s.row.slug} → /vyrobnyky/${form.slug} (308)`] : []),
    ...(redirect ? [`redirect → ${into!.slug}`] : []),
    ...(merged ? [`unmerge: ${form.slug} no longer redirects to ${keptSlug}`] : []),
  ]
  console.log(`${e.slug}: ${lines.join('\n  ') || 'no change'}${e.why && lines.length ? `\n  why: ${e.why}` : ''}`)
  if (dry || !lines.length) continue
  if (changed.length || cityChanged || dropped.length || names.length || droppedNames.length || sources.length || clearPosts || b2bChanged.length) await saveStudio(db, row.id, form, actor, 'Виправлення (скрипт)')
  if (clearActivity) await writeStudio(db, row.id, { activityLastPostDate: null, activityFollowers: null }, undefined, actor, 'Виправлення (скрипт): дані чужого акаунта прибрано')
  if (redirect)
    await db.transaction(async (tx) => {
      await tx.insert(studioSlugHistory).values({ oldSlug: e.slug, studioId: into!.id }).onConflictDoUpdate({ target: studioSlugHistory.oldSlug, set: { studioId: into!.id } })
      await audit(tx, actor, 'studio', row.id, 'merge', { into: { from: null, to: into!.slug } })
    })
  if (merged)
    await db.transaction(async (tx) => {
      await tx.delete(studioSlugHistory).where(and(eq(studioSlugHistory.oldSlug, form.slug ?? ''), eq(studioSlugHistory.studioId, merged.studioId)))
      await audit(tx, actor, 'studio', row.id, 'unmerge', { from: { from: keptSlug ?? null, to: null } })
    })
  saved++
}

missing.forEach((s) => console.log('missing', s))
if (!dry) await finishRun(db, run, { saved, missing: missing.length })
console.log(dry ? 'dry run, nothing saved' : `saved ${saved}`)
if (!dry) await revalidateSite(false)
await pool.end()
