// Studio field edits through the panel's editor (version check, revision, slug history with 301, audit):
//   EDITS=path pnpm exec tsx scripts/app/edit-studios.ts   (PROD=1 for production, DRY=1 to preview)
//   [{ "slug": "…", "why"?: "reason, printed with the change", "set"?: { "name"?, "shortName"?, "slug"?, "type"? (one of STUDIO_TYPES), "status"? (one of STUDIO_STATUSES),
//      "visibility"? ("public" | "hidden"), "address"?, "summary"?, "publicDescription"?, "recentNote"?, "website"?, "instagram"?, "facebook"? ("" clears; otherwise an absolute http(s) URL) },
//      "replace"?: [["from", "to"], …], "dropFormats"?: ["courses", …], "addNames"?: ["…"], "mergeInto"?: "kept-slug",
//      "b2b"?: { "minOrder"?, "leadTime"? ("" clears), "logoMethods"?: ["…"], "worksWithHoreca"?, "worksWithCorporate"?, "foodSafe"?, "dishwasherSafe"? (true | false | null) } }]
//   replace runs over name, address, summary, publicDescription, recentNote; dropFormats removes format tags the profile does not support (tags
//   are added only through tag-studios proposals); addNames appends alternate names; mergeInto hides a duplicate and points its slug at the kept
//   public profile (the proxy answers its old URL with a redirect, docs/decisions.md 2026-10-15) — move any facts into the kept profile first;
//   b2b sets the terms for venues and companies (only facts with a source: the profile shows them and its badges rest on them).
import fs from 'node:fs'
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios, studioSlugHistory } from '../../src/server/db/schema/catalog'
import { audit } from '../../src/server/services/audit'
import { STUDIO_STATUSES, STUDIO_TYPES, STUDIO_VISIBILITY } from '../../src/shared/options'
import { webUrl } from '../../src/lib/present'
import { getStudioForEdit, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { finishRun, scriptActor, startRun } from '../../src/server/services/imports/runs'

type Field = 'name' | 'shortName' | 'slug' | 'type' | 'status' | 'visibility' | 'address' | 'summary' | 'publicDescription' | 'recentNote' | LinkField
type LinkField = 'website' | 'instagram' | 'facebook'
type B2b = { minOrder?: string; leadTime?: string; logoMethods?: string[]; worksWithHoreca?: boolean | null; worksWithCorporate?: boolean | null; foodSafe?: boolean | null; dishwasherSafe?: boolean | null }
type Edit = { slug: string; why?: string; set?: Partial<Record<Field, string>>; replace?: [string, string][]; dropFormats?: string[]; addNames?: string[]; mergeInto?: string; b2b?: B2b }
// b2b keys → editor form fields.
const B2B = { minOrder: 'b2bMinOrder', leadTime: 'b2bLeadTime', logoMethods: 'b2bLogoMethods', worksWithHoreca: 'b2bWorksWithHoreca', worksWithCorporate: 'b2bWorksWithCorporate', foodSafe: 'b2bFoodSafe', dishwasherSafe: 'b2bDishwasherSafe' } as const

const { dry } = guard('edit-studios')
const edits = JSON.parse(fs.readFileSync(process.env.EDITS || '/tmp/hlyna-edits.json', 'utf8')) as Edit[]
const TEXT: Exclude<Field, 'slug' | 'type' | 'status' | 'visibility' | LinkField>[] = ['name', 'address', 'summary', 'publicDescription', 'recentNote']
const LINKS: LinkField[] = ['website', 'instagram', 'facebook']
const actor = scriptActor('edit-studios')
const run = dry ? 0 : await startRun(db, 'edit-studios', `${edits.length} edits`)
let saved = 0
const missing: string[] = []

for (const e of edits) {
  const [row] = await db.select({ id: studios.id }).from(studios).where(eq(studios.slug, e.slug)).limit(1)
  const s = row && (await getStudioForEdit(db, row.id))
  if (!row || !s) { missing.push(e.slug); continue }
  const form = toEditForm(s)
  for (const f of TEXT) {
    const v = form[f]
    if (typeof v === 'string') form[f] = (e.replace ?? []).reduce((acc, [a, b]) => acc.split(a).join(b), v)
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
  Object.assign(form, e.set ?? {}, ...LINKS.filter((f) => e.set?.[f] === '').map((f) => ({ [f]: null })))
  const dropped = (e.dropFormats ?? []).filter((f) => form.formats.includes(f as never))
  if (dropped.length) form.formats = form.formats.filter((f) => !dropped.includes(f))
  for (const [k, f] of Object.entries(e.b2b ?? {}) as [keyof B2b, B2b[keyof B2b]][]) {
    if (!(k in B2B)) throw new Error(`${e.slug}: unknown b2b field ${k} (one of ${Object.keys(B2B).join(', ')})`)
    Object.assign(form, { [B2B[k]]: f === '' ? null : f })
  }
  const b2bChanged = Object.values(B2B).filter((f) => JSON.stringify(form[f] ?? null) !== JSON.stringify(toEditForm(s)[f] ?? null))
  const names = (e.addNames ?? []).filter((n) => !form.alternateNames.includes(n))
  if (names.length) form.alternateNames = [...form.alternateNames, ...names]
  const changed = (['slug', 'shortName', 'type', 'status', 'visibility', ...TEXT, ...LINKS] as Field[]).filter((f) => form[f] !== toEditForm(s)[f])
  const [history] = into ? await db.select({ studioId: studioSlugHistory.studioId }).from(studioSlugHistory).where(eq(studioSlugHistory.oldSlug, e.slug)).limit(1) : []
  const redirect = into && history?.studioId !== into.id
  const lines = [
    ...changed.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f])?.slice(0, 80)} → ${JSON.stringify(form[f])?.slice(0, 80)}`),
    ...(dropped.length ? [`formats: −${dropped.join(', −')}`] : []),
    ...b2bChanged.map((f) => `${f}: ${JSON.stringify(toEditForm(s)[f] ?? null)} → ${JSON.stringify(form[f] ?? null)}`),
    ...(names.length ? [`names: +${names.join(', +')}`] : []),
    ...(redirect ? [`redirect → ${into!.slug}`] : []),
  ]
  console.log(`${e.slug}: ${lines.join('\n  ') || 'no change'}${e.why && lines.length ? `\n  why: ${e.why}` : ''}`)
  if (dry || !lines.length) continue
  if (changed.length || dropped.length || names.length || b2bChanged.length) await saveStudio(db, row.id, form, actor, 'Виправлення (скрипт)')
  if (redirect)
    await db.transaction(async (tx) => {
      await tx.insert(studioSlugHistory).values({ oldSlug: e.slug, studioId: into!.id }).onConflictDoUpdate({ target: studioSlugHistory.oldSlug, set: { studioId: into!.id } })
      await audit(tx, actor, 'studio', row.id, 'merge', { into: { from: null, to: into!.slug } })
    })
  saved++
}

missing.forEach((s) => console.log('missing', s))
if (!dry) await finishRun(db, run, { saved, missing: missing.length })
console.log(dry ? 'dry run, nothing saved' : `saved ${saved}`)
if (!dry) await revalidateSite(false)
await pool.end()
