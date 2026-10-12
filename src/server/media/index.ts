import { createHash } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type Metadata, type Sharp } from 'sharp'
import { and, desc, eq, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { media, studioPhotos, studios } from '../db/schema/catalog'
import { audit, type Actor } from '../services/audit'
import { NotFound } from '../services/requests'
import { Invalid } from '../services/studioEditor'

// Photos: one file in, seven sizes out (pages and srcsets rely on them), EXIF and GPS gone (sharp writes no metadata
// unless asked; orientation is applied first). Files live on the media volume as `<name>.<ext>` and
// `<name>-<w>x<h>.<ext>`; Caddy serves them at /media/*.

export const MEDIA_DIR = () => process.env.MEDIA_DIR ?? path.resolve(process.cwd(), 'public/media')
export const MAX_BYTES = 8 * 1024 * 1024
const ACCEPT = new Set(['jpeg', 'png', 'webp'])

// Width-only sizes keep the aspect ratio. Existing files were made with exactly these names and sizes: don't rename.
export const SIZES = [
  { name: 'thumbnail', width: 300 },
  { name: 'square', width: 500, height: 500 },
  { name: 'small', width: 600 },
  { name: 'medium', width: 900 },
  { name: 'large', width: 1400 },
  { name: 'xlarge', width: 1920 },
  { name: 'og', width: 1200, height: 630 },
] as const

type Variant = { file: string | null; width: number | null; height: number | null; size: number | null; mime: string | null }

const slugBase = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'photo'

async function encode(img: Sharp, format: string) {
  if (format === 'png') return img.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
  if (format === 'webp') return img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
  return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true })
}

/**
 * Stores an uploaded image. Same bytes uploaded twice → the existing record. `status` is 'pending' for photos an
 * owner proposes (attached only when we approve) and 'active' for ours.
 */
export async function uploadImage(
  db: Db,
  input: { bytes: Buffer; fileName: string; alt: string; studioSlug?: string | null; status?: 'active' | 'pending' },
  actor: Actor,
) {
  const alt = input.alt.trim()
  if (!alt) throw new Invalid('Додайте опис фото (alt): що на ньому видно.')
  if (input.bytes.length > MAX_BYTES) throw new Invalid('Фото більше 8 МБ.')
  let meta: Metadata
  try {
    meta = await sharp(input.bytes).metadata()
  } catch {
    throw new Invalid('Це не зображення або файл пошкоджено.')
  }
  if (!meta.format || !ACCEPT.has(meta.format)) throw new Invalid('Підходять JPG, PNG або WebP.')
  const sha256 = createHash('sha256').update(input.bytes).digest('hex')
  const [dup] = await db.select({ id: media.id }).from(media).where(eq(media.sha256, sha256)).limit(1)
  if (dup) return { id: dup.id, duplicate: true }

  const dir = MEDIA_DIR()
  await mkdir(dir, { recursive: true })
  const ext = meta.format === 'jpeg' ? 'jpg' : meta.format
  const base = `${input.studioSlug ? slugBase(input.studioSlug) : slugBase(input.fileName)}-${Date.now().toString(36)}`
  const mime = `image/${meta.format}`

  // The original, re-encoded: orientation applied, metadata (EXIF, GPS, camera) dropped.
  const original = await encode(sharp(input.bytes).rotate(), meta.format)
  const fileName = `${base}.${ext}`
  const written: string[] = []
  try {
    await writeFile(path.join(dir, fileName), original.data, { flag: 'wx' })
    written.push(fileName)
    const variants: Record<string, Variant> = {}
    for (const s of SIZES) {
      const w = original.info.width
      const resizable = 'height' in s ? true : w > s.width
      if (!resizable) {
        variants[s.name] = { file: null, width: null, height: null, size: null, mime: null }
        continue
      }
      const img = sharp(original.data).resize('height' in s ? { width: s.width, height: s.height, fit: 'cover', position: 'centre', withoutEnlargement: true } : { width: s.width, withoutEnlargement: true })
      const out = await encode(img, meta.format)
      const file = `${base}-${out.info.width}x${out.info.height}.${ext}`
      await writeFile(path.join(dir, file), out.data, { flag: 'wx' })
      written.push(file)
      variants[s.name] = { file, width: out.info.width, height: out.info.height, size: out.data.length, mime }
    }
    const [row] = await db
      .insert(media)
      .values({
        fileName,
        mime,
        size: original.data.length,
        width: original.info.width,
        height: original.info.height,
        sha256,
        alt,
        variants,
        status: input.status ?? 'active',
        uploadedBy: actor.id,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning({ id: media.id })
    await audit(db, actor, 'media', row!.id, 'create', { fileName: { from: null, to: fileName }, alt: { from: null, to: alt } })
    return { id: row!.id, duplicate: false }
  } catch (e) {
    await Promise.all(written.map((f) => unlink(path.join(dir, f)).catch(() => undefined)))
    throw e
  }
}

export async function listMedia(db: Db, f: { filter?: 'unused' | 'pending' | 'used'; limit?: number; beforeId?: number }) {
  const limit = Math.min(f.limit ?? 60, 120)
  const used = sql`exists (select 1 from ${studioPhotos} sp where sp.media_id = "app"."media"."id")`
  const rows = await db
    .select({
      id: media.id,
      fileName: media.fileName,
      alt: media.alt,
      width: media.width,
      height: media.height,
      size: media.size,
      status: media.status,
      thumb: sql<string | null>`${media.variants} -> 'thumbnail' ->> 'file'`,
      usedBy: sql<number>`(select count(*)::int from ${studioPhotos} sp where sp.media_id = "app"."media"."id")`,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(
      and(
        f.filter === 'unused' ? sql`not ${used}` : f.filter === 'used' ? used : f.filter === 'pending' ? eq(media.status, 'pending') : undefined,
        f.beforeId ? sql`${media.id} < ${f.beforeId}` : undefined,
      ),
    )
    .orderBy(desc(media.id))
    .limit(limit + 1)
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit, next: rows.length > limit ? rows[limit - 1]!.id : null }
}

/** Which profiles show a photo. */
export async function updateMedia(db: Db, id: number, patch: { alt?: string; caption?: string | null }, actor: Actor) {
  const [cur] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!cur) throw new NotFound('Фото не знайдено.')
  if (patch.alt !== undefined && !patch.alt.trim()) throw new Invalid('Опис фото (alt) не може бути порожнім.')
  const next = { alt: patch.alt?.trim() ?? cur.alt, caption: patch.caption === undefined ? cur.caption : patch.caption }
  const changes = Object.fromEntries(
    (['alt', 'caption'] as const).filter((k) => (cur[k] ?? null) !== (next[k] ?? null)).map((k) => [k, { from: cur[k], to: next[k] }]),
  )
  if (!Object.keys(changes).length) return { changes }
  await db.update(media).set({ ...next, updatedAt: sql`now()`, updatedBy: actor.id }).where(eq(media.id, id))
  await audit(db, actor, 'media', id, 'update', changes)
  return { changes }
}

/** Studios whose profile shows this photo. */
function mediaUsage(db: Db, id: number) {
  return db
    .select({ id: studios.id, name: studios.name, slug: studios.slug })
    .from(studioPhotos)
    .innerJoin(studios, eq(studios.id, studioPhotos.studioId))
    .where(eq(studioPhotos.mediaId, id))
}

/** Deletes a photo and all its sizes — only when no profile shows it. */
export async function deleteMedia(db: Db, id: number, actor: Actor) {
  const [cur] = await db.select().from(media).where(eq(media.id, id)).limit(1)
  if (!cur) throw new NotFound('Фото не знайдено.')
  const usage = await mediaUsage(db, id)
  if (usage.length) throw new Invalid(`Фото показується на профілі: ${usage.map((u) => u.name).join(', ')}. Спершу приберіть його звідти.`)
  await db.delete(media).where(and(eq(media.id, id), sql`not exists (select 1 from ${studioPhotos} sp where sp.media_id = ${id})`))
  const files = [cur.fileName, ...Object.values(cur.variants ?? {}).map((v) => v.file)].filter((f): f is string => Boolean(f))
  await Promise.all(files.map((f) => unlink(path.join(MEDIA_DIR(), path.basename(f))).catch(() => undefined)))
  await audit(db, actor, 'media', id, 'deleted', { fileName: { from: cur.fileName, to: null } })
  return { deleted: true }
}

export const mediaUrl = (file: string | null | undefined) => (file ? `/media/${encodeURIComponent(path.basename(file))}` : null)

