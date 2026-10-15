import { and, asc, eq, isNotNull, lte, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { media, studioPhotos, studios } from '../db/schema/catalog'
import { changeSets } from '../db/schema/history'
import { deleteMedia, MAX_BYTES, updateMedia, uploadImage } from '../media'
import { ownerEditKeyboard } from '../telegram/actions'
import { tg } from '../telegram/tg'
import { MAX_OWNER_PHOTOS } from '../../shared/options'
import type { KabinetPhoto, PhotosOk } from '../../shared/kabinet'
import { audit, type Actor } from './audit'
import { normalizeProposed } from './changeSets'
import { defaultAlt, effectiveValue, Forbidden, loadOwned, mergeIntoChangeSet, photoList, summarize, type Loaded } from './kabinet'
import { Invalid } from './studioEditor'

// Photos in the owner's cabinet: every action (add, remove, reorder, caption) saves at once into the studio's pending
// change set. New files are «pending» media until we accept them. The editor hears about photos once, ten minutes after
// the owner's last photo action (`photos_notify_at`, sent by sendDuePhotoNotices), not once per action.

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const owned = async (db: Db, userId: string, slug: string) => {
  const l = await loadOwned(db, userId, slug)
  if (!l) throw new Forbidden('Немає доступу до цієї студії.')
  return l
}
const photoIds = (l: Loaded) => [...new Set((effectiveValue(l, 'photos') as number[] | null) ?? [])]

async function result(db: Db, userId: string, slug: string): Promise<PhotosOk> {
  const l = (await loadOwned(db, userId, slug))!
  return { photos: await photoList(db, l), studio: summarize(l) }
}

/** What the server has now (the page refetches it after a refused order). */
export async function photosOf(db: Db, input: { userId: string; slug: string }): Promise<PhotosOk> {
  await owned(db, input.userId, input.slug)
  return result(db, input.userId, input.slug)
}

/**
 * Adds one uploaded photo to the end of the profile's photos (as pending media). The caption is optional: without it the
 * photo gets a plain alt text and the editor writes the real one on review. The same file twice is listed once. The
 * photo is appended to the list as it is when the change set is locked, so a reorder that ran meanwhile is kept.
 */
export async function addPhoto(
  db: Db,
  input: { userId: string; slug: string; bytes: Buffer; fileName: string; mime: string; caption?: string },
): Promise<PhotosOk & { photo: KabinetPhoto }> {
  const l = await owned(db, input.userId, input.slug)
  if (!IMAGE_TYPES.has(input.mime)) throw new Invalid('Це не фото. Підійдуть JPG, PNG, HEIC.')
  if (input.bytes.length > MAX_BYTES) throw new Invalid('Фото більше 8 МБ.')
  const full = new Invalid(`У профілі максимум ${MAX_OWNER_PHOTOS} фото.`)
  if (photoIds(l).length >= MAX_OWNER_PHOTOS) throw full
  const alt = input.caption?.trim().slice(0, 200) || defaultAlt(l.s)
  const actor: Actor = { id: input.userId, source: 'kabinet' }
  const up = await uploadImage(db, { bytes: input.bytes, fileName: l.s.slug, alt, studioSlug: l.s.slug, status: 'pending' }, actor)
  try {
    await mergeIntoChangeSet(db, l, input.userId, { consentPhotos: true }, {
      photos: (current) => {
        if (current.includes(up.id)) return null
        if (current.length >= MAX_OWNER_PHOTOS) throw full
        return [...current, up.id]
      },
      newMediaIds: up.duplicate ? [] : [up.id],
      photosNotify: true,
      changes: {},
    })
  } catch (e) {
    // The list filled up while this file was on its way: do not leave the new file behind.
    if (!up.duplicate) await deleteMedia(db, up.id, actor).catch(() => undefined)
    throw e
  }
  const out = await result(db, input.userId, input.slug)
  return { ...out, photo: out.photos.find((p) => p.id === up.id)! }
}

/**
 * Sets the full list of photos: removing, reordering and making one main are all «this is the list now». Only photos of
 * this profile (published, proposed or uploaded in this change set) are accepted; repeats are dropped. The list is
 * checked against what is there when the change set is locked; a photo that is there but that the page did not know
 * (`known`: every id it has a tile for) was uploaded meanwhile and stays, at the end.
 */
export async function setPhotoOrder(db: Db, input: { userId: string; slug: string; order: number[]; known?: number[] }): Promise<PhotosOk> {
  const l = await owned(db, input.userId, input.slug)
  const order = [...new Set(input.order)]
  const known = input.known && new Set([...input.known, ...order])
  await mergeIntoChangeSet(db, l, input.userId, {}, {
    photos: (current, open) => {
      const allowed = new Set([...l.photoIds, ...current, ...(open?.newMediaIds ?? [])])
      if (order.some((id) => !Number.isInteger(id) || !allowed.has(id))) throw new Invalid('Є фото, яких нема у вашому профілі.')
      const next = [...order, ...(known ? current.filter((id) => !known.has(id)) : [])]
      return JSON.stringify(next) === JSON.stringify(current) ? null : next
    },
    photosNotify: true,
    changes: {},
  })
  return result(db, input.userId, input.slug)
}

/** Sets the caption of a photo the owner uploaded and that is still on review (empty → the plain default). */
export async function setPhotoCaption(db: Db, input: { userId: string; slug: string; mediaId: number; caption: string }): Promise<{ photo: KabinetPhoto }> {
  const l = await owned(db, input.userId, input.slug)
  if (!l.cs?.newMediaIds.includes(input.mediaId)) throw new Forbidden('Підпис можна змінити лише для ваших нових фото.')
  const [m] = await db.select({ status: media.status }).from(media).where(eq(media.id, input.mediaId)).limit(1)
  if (m?.status !== 'pending') throw new Forbidden('Підпис можна змінити лише для ваших нових фото.')
  const actor: Actor = { id: input.userId, source: 'kabinet' }
  await updateMedia(db, input.mediaId, { alt: input.caption.trim().slice(0, 200) || defaultAlt(l.s) }, actor)
  await db.update(changeSets).set({ photosNotifyAt: sql`now() + interval '10 minutes'`, updatedAt: sql`now()` }).where(eq(changeSets.id, l.cs.id))
  await audit(db, actor, 'change_set', l.cs.id, 'update', { caption: { from: null, to: input.mediaId } })
  const photo = (await photoList(db, (await loadOwned(db, input.userId, input.slug))!)).find((p) => p.id === input.mediaId)
  return { photo: photo! }
}

/** What differs between the published photos and the proposed list: «нових: 2, прибрано: 1, порядок змінено». */
const photoDiff = (published: number[], proposed: number[]) => {
  const added = proposed.filter((id) => !published.includes(id)).length
  const removed = published.filter((id) => !proposed.includes(id)).length
  const kept = (xs: number[], of: number[]) => xs.filter((id) => of.includes(id))
  const reordered = JSON.stringify(kept(published, proposed)) !== JSON.stringify(kept(proposed, published))
  return [added && `нових: ${added}`, removed && `прибрано: ${removed}`, reordered && 'порядок змінено'].filter(Boolean).join(', ')
}

/**
 * Tells the editor in Telegram about photo changes whose quiet time (10 minutes after the owner's last photo action)
 * has passed. The time is cleared in the same statement that finds it, so two runs never send twice; a change set that
 * was published or rejected meanwhile sends nothing; a failed send is tried again a minute later. Returns how many were sent.
 */
export async function sendDuePhotoNotices(db: Db): Promise<number> {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return 0
  const due = await db
    .update(changeSets)
    .set({ photosNotifyAt: null })
    .where(and(eq(changeSets.status, 'pending'), isNotNull(changeSets.photosNotifyAt), lte(changeSets.photosNotifyAt, sql`now()`)))
    .returning({ id: changeSets.id, studioId: changeSets.studioId, proposed: changeSets.proposed })
  let sent = 0
  for (const cs of due) {
    const [s] = await db.select({ name: studios.name }).from(studios).where(eq(studios.id, cs.studioId)).limit(1)
    const published = (await db.select({ id: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, cs.studioId)).orderBy(asc(studioPhotos.position))).map((p) => p.id)
    const proposed = normalizeProposed(cs.proposed as Record<string, unknown>).photos as number[] | undefined
    const counts = s && proposed ? photoDiff(published, proposed) : ''
    if (!counts) continue
    const text = `Фото від власника: ${s!.name}\n${counts}`
    const ok = await tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, reply_markup: { inline_keyboard: ownerEditKeyboard(cs.studioId, cs.id) } })
    if (ok) sent++
    else await db.update(changeSets).set({ photosNotifyAt: sql`now() + interval '1 minute'` }).where(and(eq(changeSets.id, cs.id), eq(changeSets.status, 'pending'), sql`${changeSets.photosNotifyAt} is null`))
  }
  return sent
}
