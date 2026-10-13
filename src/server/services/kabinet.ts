import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { studioOwner } from '../db/schema/auth'
import { media, studioPhotos, studioPrices, studios } from '../db/schema/catalog'
import { changeSets } from '../db/schema/history'
import { mediaUrl, uploadImage } from '../media'
import { ownerEditKeyboard } from '../telegram/actions'
import { tg } from '../telegram/tg'
import { ownerStudioEdit, type OwnerStudioEdit } from '../../shared/schemas'
import { audit, type Actor } from './audit'
import { normalizeProposed } from './changeSets'
import { Invalid } from './studioEditor'
import { MAX_OWNER_PHOTOS } from '../../shared/options'

// The studio owner's cabinet on the new stack. Owners never write to studios: every save becomes (or updates) the
// studio's one pending change set, field by field, and new photos are stored as «pending» media until we accept them.
// The form an owner sees shows their pending proposal on top of the published data, so they continue where they left off.

const MAX_FILE = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type OwnerStudioCard = { id: number; name: string; slug: string; pending: boolean }

export async function ownerStudios(db: Db, userId: string): Promise<OwnerStudioCard[]> {
  return db
    .select({
      id: studios.id,
      name: studios.name,
      slug: studios.slug,
      pending: sql<boolean>`exists (select 1 from app.change_sets c where c.studio_id = "app"."studios"."id" and c.status = 'pending')`,
    })
    .from(studioOwner)
    .innerJoin(studios, eq(studios.id, studioOwner.studioId))
    .where(eq(studioOwner.userId, userId))
    .orderBy(asc(studioOwner.position), asc(studios.name))
}

/** The owner's studio by slug, or null when it isn't theirs (the caller answers 403/404, never leaks other studios). */
async function ownedBySlug(db: Db, userId: string, slug: string) {
  const [s] = await db
    .select()
    .from(studios)
    .innerJoin(studioOwner, and(eq(studioOwner.studioId, studios.id), eq(studioOwner.userId, userId)))
    .where(eq(studios.slug, slug))
    .limit(1)
  return s?.studios ?? null
}

export type OwnerEditInitial = {
  slug: string
  name: string
  publicNow: string
  ownerAbout: string
  ownerNews: string
  ownerQuote: string
  services: string[]
  products: string[]
  prices: { text: string; date: string; source?: string }[]
  address: string
  website: string
  instagram: string
  phone: string
  email: string
  b2b: { minOrder: string; leadTime: string; logoMethods: string[]; foodSafe: boolean; dishwasherSafe: boolean; worksWithHoreca: boolean; worksWithCorporate: boolean }
  photos: { id: number; url: string; alt: string }[]
  instagramPosts: string[]
  pending: boolean
}

const t = (v: string | null | undefined) => v ?? ''

/** What the cabinet edit form starts from: published data with the owner's pending proposal applied on top. */
export async function ownerEditInitial(db: Db, userId: string, slug: string): Promise<{ name: string; initial: OwnerEditInitial } | null> {
  const s = await ownedBySlug(db, userId, slug)
  if (!s) return null
  const prices = await db.select().from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))
  const photoIds = (await db.select({ id: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, s.id)).orderBy(asc(studioPhotos.position))).map((p) => p.id)
  const [cs] = await db.select().from(changeSets).where(and(eq(changeSets.studioId, s.id), eq(changeSets.status, 'pending'))).limit(1)
  const p = cs ? normalizeProposed(cs.proposed as Record<string, unknown>) : {}

  const b2b = (p.b2b as OwnerEditInitial['b2b'] & { minOrder: string | null; leadTime: string | null } | undefined) ?? {
    minOrder: s.b2bMinOrder,
    leadTime: s.b2bLeadTime,
    logoMethods: s.b2bLogoMethods ?? [],
    foodSafe: Boolean(s.b2bFoodSafe),
    dishwasherSafe: Boolean(s.b2bDishwasherSafe),
    worksWithHoreca: Boolean(s.b2bWorksWithHoreca),
    worksWithCorporate: Boolean(s.b2bWorksWithCorporate),
  }
  const shownPhotoIds = [...new Set((p.photos as number[] | undefined) ?? photoIds)]
  const rows = shownPhotoIds.length ? await db.select().from(media).where(inArray(media.id, shownPhotoIds)) : []
  const byId = new Map(rows.map((m) => [m.id, m]))
  const priceLines = (p.prices as { text: string; source: string | null; dateText: string | null }[] | undefined) ?? prices.map((x) => ({ text: x.text, source: x.source, dateText: x.dateText }))

  const pick = <K extends keyof typeof p>(k: K, fallback: string | null) => (k in p ? (p[k] as string | null) : fallback)
  return {
    name: s.name,
    initial: {
      slug: s.slug,
      name: s.name,
      publicNow: t(s.publicDescription || s.summary),
      ownerAbout: t(pick('ownerAbout', s.ownerAbout)),
      ownerNews: t(pick('ownerNews', s.ownerNews)),
      ownerQuote: t(pick('ownerQuote', s.ownerQuote)),
      services: (p.services as string[] | undefined) ?? s.services ?? [],
      products: (p.products as string[] | undefined) ?? s.products ?? [],
      prices: priceLines.map((x) => ({ text: x.text, date: t(x.dateText), source: t(x.source) })),
      address: t(pick('address', s.address)),
      website: t(pick('website', s.website)),
      instagram: t(pick('instagram', s.instagram)),
      phone: t(pick('phone', s.phone)),
      email: t(pick('email', s.email)),
      b2b: { ...b2b, minOrder: t(b2b.minOrder), leadTime: t(b2b.leadTime), logoMethods: b2b.logoMethods ?? [] },
      photos: shownPhotoIds
        .map((id) => byId.get(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((m) => ({ id: m.id, url: mediaUrl(m.variants?.small?.file ?? m.fileName) ?? '', alt: t(m.alt) })),
      instagramPosts: (p.instagramPosts as string[] | undefined) ?? s.instagramPosts ?? [],
      pending: Boolean(cs),
    },
  }
}

export type NewPhoto = { bytes: Buffer; fileName: string; mime: string; alt: string }

const monthYear = (d = new Date()) => `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

/**
 * Saves an owner's edit as the studio's pending change set (created or replaced). Only whitelisted fields
 * (ownerStudioEdit) can be proposed; new photos become pending media. Returns the change set id.
 */
export async function submitOwnerEdit(
  db: Db,
  input: { userId: string; ownerName: string; slug: string; data: unknown; photos: NewPhoto[] },
): Promise<{ changeSetId: number; studioId: number; newPhotos: number }> {
  const s = await ownedBySlug(db, input.userId, input.slug)
  if (!s) throw new Forbidden('Немає доступу до цієї студії.')
  const parsed = ownerStudioEdit.safeParse(input.data)
  if (!parsed.success) throw new Invalid(parsed.error.issues[0]?.message ?? 'Перевірте форму.')
  const d: OwnerStudioEdit = parsed.data
  const actor: Actor = { id: input.userId, source: 'kabinet' }

  const currentPrices = await db.select().from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))
  const currentPhotos = (await db.select({ id: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, s.id)).orderBy(asc(studioPhotos.position))).map((p) => p.id)
  const [open] = await db.select().from(changeSets).where(and(eq(changeSets.studioId, s.id), eq(changeSets.status, 'pending'))).limit(1)
  const openPhotos = open ? ((normalizeProposed(open.proposed as Record<string, unknown>).photos as number[] | undefined) ?? currentPhotos) : currentPhotos

  // Photos: keep what the owner kept (from the published or the pending set), then new uploads, at most MAX_OWNER_PHOTOS.
  const keep = new Set(d.keepPhotos)
  const photoIds = [...new Set([...currentPhotos, ...openPhotos])].filter((id) => keep.has(id))
  const newMediaIds: number[] = []
  for (const [i, f] of input.photos.entries()) {
    if (photoIds.length >= MAX_OWNER_PHOTOS) break
    if (!IMAGE_TYPES.has(f.mime) || f.bytes.length > MAX_FILE) throw new Invalid(`Фото «${f.fileName}»: лише JPG, PNG або WebP до 8 МБ.`)
    if (!f.alt.trim()) throw new Invalid(`Додайте короткий опис до фото «${f.fileName}».`)
    const up = await uploadImage(db, { bytes: f.bytes, fileName: `${s.slug}-${i}`, alt: `${f.alt.trim().slice(0, 200)} — ${s.name}`, studioSlug: s.slug, status: 'pending' }, actor)
    // The same file uploaded again (sha256 match) is the same media row: don't list it twice.
    if (!photoIds.includes(up.id)) photoIds.push(up.id)
    if (!up.duplicate) newMediaIds.push(up.id)
  }

  // A price line left as it was keeps its source; new or edited lines are «від студії, MM.YYYY».
  const ownerSource = `від студії, ${monthYear()}`
  const prices = d.prices.map((p) => {
    const old = currentPrices.find((x) => x.text === p.text)
    return { text: p.text, dateText: p.date || null, source: old && (p.source ?? '') === (old.source ?? '') ? old.source : ownerSource }
  })

  const proposed = {
    ownerAbout: d.ownerAbout,
    ownerNews: d.ownerNews,
    ownerQuote: d.ownerQuote,
    services: d.services,
    products: d.products,
    prices,
    address: d.address,
    website: d.website,
    instagram: d.instagram,
    phone: d.phone,
    email: d.email,
    b2b: d.b2b,
    photos: photoIds,
    instagramPosts: d.instagramPosts,
    consentPhotos: photoIds.length > 0 ? true : Boolean(s.consentPhotos),
  }

  const changeSetId = await db.transaction(async (tx) => {
    let id: number
    if (open) {
      await tx
        .update(changeSets)
        .set({ proposed, newMediaIds: [...new Set([...open.newMediaIds, ...newMediaIds])], baseRevision: s.revision, authorId: input.userId, updatedAt: sql`now()` })
        .where(eq(changeSets.id, open.id))
      id = open.id
    } else {
      const [row] = await tx
        .insert(changeSets)
        .values({ studioId: s.id, authorId: input.userId, status: 'pending', baseRevision: s.revision, proposed, newMediaIds })
        .returning({ id: changeSets.id })
      id = row!.id
    }
    await audit(tx, actor, 'change_set', id, open ? 'update' : 'create', { studio: { from: null, to: s.slug }, newPhotos: { from: null, to: newMediaIds.length } })
    return id
  })

  try {
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (process.env.TELEGRAM_BOT_TOKEN && chatId) {
      const news = d.ownerNews && d.ownerNews !== (s.ownerNews ?? '') ? d.ownerNews : ''
      const text = [
        `Зміни від власника: ${s.name}`,
        `${input.ownerName}${input.photos.length ? `, нових фото: ${input.photos.length}` : ''}${d.ownerAbout && d.ownerAbout !== (s.ownerAbout ?? '') ? ', є текст «своїми словами» — перепишіть голосом сайту' : ''}`,
        ...(news ? ['', 'Новини від студії (вийдуть як є після «Опублікувати»):', news] : []),
      ].join('\n')
      await tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, reply_markup: { inline_keyboard: ownerEditKeyboard(s.id, changeSetId) } })
    }
  } catch (e) {
    console.error('Telegram notification error', String(e).slice(0, 200))
  }
  return { changeSetId, studioId: s.id, newPhotos: newMediaIds.length }
}

export class Forbidden extends Error {}
