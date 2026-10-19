// A studio's own photos, published with its consent: uploads every file listed in <dir>/alt.tsv (file, alt, …; header
// row first), puts PROFILE's files on the profile in that order and ticks the photo consent with NOTE. Extra folders
// (EXTRA=dir1,dir2) are only uploaded, for collection items (TopItem.photos = the first 12 hex of a file's sha256,
// printed here). Same bytes uploaded twice → the existing media record.
//   SLUG=zirka-z-neba PROFILE=<dir> EXTRA=<dir> NOTE="19.10.2026: …" pnpm exec tsx scripts/app/studio-photos.ts
// DRY=1 prints the plan. Production (PROD=1): files are written to MEDIA_DIR on this machine, so point it at an empty
// folder and copy that folder into the server's media volume right after the run, before anyone opens the profile
// (deploy/README.md «Studio photos»); the run revalidates only when SITE_URL and REVALIDATE_SECRET are set.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'

import { guard, revalidateSite } from './_guard'
import { db, pool } from '../../src/server/db'
import { studios } from '../../src/server/db/schema/catalog'
import { uploadImage } from '../../src/server/media'
import { getStudioForEdit, saveStudio, toEditForm } from '../../src/server/services/studioEditor'
import { scriptActor } from '../../src/server/services/imports/runs'

const { dry, prod } = guard('studio-photos')
const slug = process.env.SLUG ?? ''
const profileDir = process.env.PROFILE ?? ''
const extra = (process.env.EXTRA ?? '').split(',').filter(Boolean)
const note = process.env.NOTE ?? ''
if (!slug || (!profileDir && !extra.length)) throw new Error('SLUG and PROFILE (or EXTRA) are required')
if (profileDir && !note) throw new Error('NOTE (the consent note: date, scope, who reported it) is required with PROFILE')
if (prod && !dry && !process.env.MEDIA_DIR) throw new Error('production: set MEDIA_DIR to an empty folder to copy to the server')

const list = (dir: string) =>
  fs.readFileSync(path.join(dir, 'alt.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => {
    const [file, alt] = l.split('\t')
    return { file: path.join(dir, file), alt }
  })

const [s] = await db.select({ id: studios.id, name: studios.name }).from(studios).where(eq(studios.slug, slug)).limit(1)
if (!s) throw new Error(`no studio «${slug}»`)
const actor = scriptActor('studio-photos')
const upload = async (dir: string) => {
  const ids: number[] = []
  for (const { file, alt } of list(dir)) {
    const bytes = fs.readFileSync(file)
    const sha = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    if (dry) { console.log(`${path.basename(file)} ${sha} «${alt}»`); continue }
    const r = await uploadImage(db, { bytes, fileName: path.basename(file), alt, studioSlug: slug, status: 'active' }, actor)
    console.log(`${path.basename(file)} ${sha} media ${r.id}${r.duplicate ? ' (already there)' : ''}`)
    ids.push(r.id)
  }
  return ids
}

const profile = profileDir ? await upload(profileDir) : []
for (const d of extra) await upload(d)
if (profileDir && !dry) {
  const cur = await getStudioForEdit(db, s.id)
  if (!cur) throw new Error('studio vanished')
  await saveStudio(db, s.id, { ...toEditForm(cur), photoIds: profile, consentPhotos: true, consentNotes: note }, actor, 'Фото студії зі згоди')
  console.log(`${s.name}: ${profile.length} photos on the profile, consent ticked`)
}
console.log(dry ? 'dry run, nothing saved' : 'done')
await revalidateSite(dry)
await pool.end()
