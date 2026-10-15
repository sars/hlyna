import { and, asc, eq, inArray, sql } from 'drizzle-orm'

import type { Db } from '../db'
import { studioOwner } from '../db/schema/auth'
import { cities, media, studioPhotos, studioPrices, studios } from '../db/schema/catalog'
import { changeSets } from '../db/schema/history'
import { mediaUrl } from '../media'
import { ownerEditKeyboard } from '../telegram/actions'
import { tg } from '../telegram/tg'
import { pluralUk, TYPE_LABEL } from '../../lib/catalog'
import { displayName } from '../../lib/present'
import {
  ownerAboutSection,
  ownerB2bSection,
  ownerContactsSection,
  ownerPricesSection,
  ownerServicesSection,
} from '../../shared/schemas'
import { KABINET_SECTIONS, KABINET_SECTION_TITLE, type KabinetSection } from '../../shared/options'
import type { KabinetPhoto, SaveOk, SectionPage, SectionSummary, SectionValues, StudioSummary } from '../../shared/kabinet'
import { audit, same, type Actor, type Changes } from './audit'
import { currentValue, normalizeProposed, type FieldKey } from './changeSets'
import { Invalid } from './studioEditor'

// The studio owner's cabinet. Owners never write to studios: every section save is merged into the studio's one pending
// change set (only that section's keys), and new photos are stored as «pending» media until we accept them. What an owner
// sees is the published studio with that proposal on top, so they continue where they left off. Photos: kabinetPhotos.ts.

export class Forbidden extends Error {}
/** A section that did not pass validation; `fields` maps a value key («phone», «prices.2.text») to its message. */
export class FieldErrors extends Invalid {
  constructor(public fields: Record<string, string>) {
    super('Перевірте поля форми.')
  }
}

type Row = typeof studios.$inferSelect
type Price = { text: string; source: string | null; dateText: string | null }
type B2bRaw = { minOrder: string | null; leadTime: string | null; logoMethods: string[]; foodSafe: boolean; dishwasherSafe: boolean; worksWithHoreca: boolean; worksWithCorporate: boolean }
type Saveable = Exclude<KabinetSection, 'foto'>

/** A studio the owner owns: published rows, the open change set and its proposal (normalised). */
export type Loaded = {
  s: Row
  city: string | null
  prices: Price[]
  photoIds: number[]
  cs: typeof changeSets.$inferSelect | null
  p: Partial<Record<FieldKey, unknown>>
}

/** Change-set keys that make up each section (what a save writes and what «на перевірці» looks at). */
const SECTION_KEYS: Record<KabinetSection, FieldKey[]> = {
  'pro-studiyu': ['ownerAbout', 'ownerNews', 'ownerQuote'],
  posluhy: ['services', 'products'],
  tsiny: ['prices'],
  biznes: ['b2b'],
  kontakty: ['address', 'phone', 'email', 'website', 'instagram', 'instagramPosts'],
  foto: ['photos'],
}

const t = (v: string | null | undefined) => v ?? ''
const iso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null)
/** The alt text a photo gets when the owner wrote no caption (the editor writes the real one on review). */
export const defaultAlt = (s: { name: string }) => `Фото від студії — ${s.name}`

async function loadState(db: Db, s: Row, city: string | null): Promise<Loaded> {
  const prices = await db.select({ text: studioPrices.text, source: studioPrices.source, dateText: studioPrices.dateText }).from(studioPrices).where(eq(studioPrices.studioId, s.id)).orderBy(asc(studioPrices.position))
  const photoIds = (await db.select({ id: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, s.id)).orderBy(asc(studioPhotos.position))).map((p) => p.id)
  const [cs] = await db.select().from(changeSets).where(and(eq(changeSets.studioId, s.id), eq(changeSets.status, 'pending'))).limit(1)
  return { s, city, prices, photoIds, cs: cs ?? null, p: cs ? normalizeProposed(cs.proposed as Record<string, unknown>) : {} }
}

/** The owner's studio by slug with its state, or null when it isn't theirs (callers answer 403/404, never leak others). */
export async function loadOwned(db: Db, userId: string, slug: string): Promise<Loaded | null> {
  const [r] = await db
    .select({ s: studios, city: cities.name })
    .from(studios)
    .innerJoin(studioOwner, and(eq(studioOwner.studioId, studios.id), eq(studioOwner.userId, userId)))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(eq(studios.slug, slug))
    .limit(1)
  return r ? loadState(db, r.s, r.city) : null
}

/** Effective value of a key: the open proposal over the published studio. */
export const effectiveValue = (l: Loaded, k: FieldKey): unknown => (k in l.p ? l.p[k] : currentValue(k, l.s, l.prices, l.photoIds))

/** All sections' effective values as plain strings and lists. */
function effective(l: Loaded) {
  const v = (k: FieldKey) => effectiveValue(l, k)
  const b = v('b2b') as B2bRaw
  return {
    ownerAbout: t(v('ownerAbout') as string | null),
    ownerNews: t(v('ownerNews') as string | null),
    ownerQuote: t(v('ownerQuote') as string | null),
    services: (v('services') as string[] | null) ?? [],
    products: (v('products') as string[] | null) ?? [],
    prices: ((v('prices') as Price[] | null) ?? []).map((x) => ({ text: x.text, date: t(x.dateText), source: t(x.source) })),
    b2b: { minOrder: t(b.minOrder), leadTime: t(b.leadTime), logoMethods: b.logoMethods ?? [], foodSafe: b.foodSafe, dishwasherSafe: b.dishwasherSafe, worksWithHoreca: b.worksWithHoreca, worksWithCorporate: b.worksWithCorporate },
    address: t(v('address') as string | null),
    phone: t(v('phone') as string | null),
    email: t(v('email') as string | null),
    website: t(v('website') as string | null),
    instagram: t(v('instagram') as string | null),
    instagramPosts: (v('instagramPosts') as string[] | null) ?? [],
    photos: [...new Set((v('photos') as number[] | null) ?? [])],
  }
}
type Effective = ReturnType<typeof effective>

// ---------------------------------------------------------------- summary

const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
/** Sortable «жовтень 2026» / «2025» (0 when there is no year). */
const dateRank = (d: string) => {
  const y = Number(/\d{4}/.exec(d)?.[0])
  return y ? y * 13 + MONTHS.findIndex((m) => d.toLowerCase().includes(m)) + 1 : 0
}
const count = (n: number, forms: [string, string, string]) => `${n} ${pluralUk(n, forms)}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function isFilled(section: KabinetSection, e: Effective, s: Row): boolean {
  switch (section) {
    case 'pro-studiyu': return Boolean(s.publicDescription || e.ownerAbout || e.ownerNews || e.ownerQuote)
    case 'posluhy': return e.services.length + e.products.length > 0
    case 'tsiny': return e.prices.length > 0
    case 'biznes': return Boolean(e.b2b.minOrder || e.b2b.leadTime || e.b2b.logoMethods.length || e.b2b.foodSafe || e.b2b.dishwasherSafe || e.b2b.worksWithHoreca || e.b2b.worksWithCorporate)
    case 'kontakty': return Boolean(e.address || e.phone || e.email)
    case 'foto': return e.photos.length > 0
  }
}

/** What is there, in a few words (what to add when it is empty). */
function lineOf(section: KabinetSection, e: Effective, s: Row): string {
  switch (section) {
    case 'pro-studiyu': {
      const own = e.ownerAbout ? 'Свій текст ви додали.' : 'Своїми словами — ще ні.'
      const base = s.publicDescription ? `Опис від редактора є. ${own}` : e.ownerAbout ? 'Свій текст ви додали, редактор перепише його голосом сайту.' : 'Розкажіть про студію своїми словами.'
      return [base, e.ownerNews && 'Є новини студії.', e.ownerQuote && 'Є цитата.'].filter(Boolean).join(' ')
    }
    case 'posluhy': {
      const parts = [e.services.length && count(e.services.length, ['послуга', 'послуги', 'послуг']), e.products.length && count(e.products.length, ['виріб', 'вироби', 'виробів'])].filter(Boolean)
      return parts.length ? parts.join(', ') : 'Що робите і що продаєте'
    }
    case 'tsiny': {
      if (!e.prices.length) return 'Що, скільки триває й скільки коштує'
      const latest = e.prices.map((p) => p.date).filter(Boolean).sort((a, b) => dateRank(b) - dateRank(a))[0]
      return `${count(e.prices.length, ['ціна', 'ціни', 'цін'])}${latest && dateRank(latest) ? ` · ${latest}` : ''}`
    }
    case 'biznes': {
      const b = e.b2b
      const parts = [b.minOrder && 'мінімальне замовлення', b.leadTime && 'терміни', b.logoMethods.length && 'логотип', b.foodSafe && 'полива безпечна для їжі', b.dishwasherSafe && 'посудомийка', b.worksWithHoreca && 'для закладів', b.worksWithCorporate && 'корпоративні замовлення'].filter(Boolean) as string[]
      return parts.length ? cap(parts.join(', ')) : 'Мінімальне замовлення, терміни, логотип'
    }
    case 'kontakty': {
      const parts = [e.address && 'адреса', e.phone && 'телефон', e.website && 'сайт', e.instagram && 'Instagram', e.email && 'email'].filter(Boolean) as string[]
      return parts.length ? `${cap(parts.join(', '))}${e.phone ? '' : ' · без телефону'}` : 'Адреса, телефон, email, сайт, Instagram'
    }
    case 'foto':
      return e.photos.length ? `${e.photos.length} фото` : 'Роботи, студія, заняття — до 10'
  }
}

/** The empty sections as genitive nouns («Бракує: …»), then «телефону» when contacts are there but the phone is not. */
const MISSING_LABEL: Record<KabinetSection, string> = {
  foto: 'фото', biznes: 'умов для бізнесу', tsiny: 'цін', posluhy: 'послуг і виробів', 'pro-studiyu': 'опису студії', kontakty: 'контактів',
}
const MISSING_ORDER: KabinetSection[] = ['foto', 'biznes', 'tsiny', 'posluhy', 'pro-studiyu', 'kontakty']

/** The overview of a loaded studio. */
export function summarize(l: Loaded): StudioSummary {
  const { s, cs } = l
  const e = effective(l)
  const sections: SectionSummary[] = KABINET_SECTIONS.map((key) => {
    const review = SECTION_KEYS[key].some((k) => k in l.p && !same(currentValue(k, s, l.prices, l.photoIds), l.p[k]))
    const filled = isFilled(key, e, s)
    return { key, title: KABINET_SECTION_TITLE[key], state: review ? 'review' : filled ? 'live' : 'missing', line: lineOf(key, e, s) }
  })
  const empty = new Set(KABINET_SECTIONS.filter((k) => !isFilled(k, e, s)))
  const missing = MISSING_ORDER.filter((k) => empty.has(k)).map((section) => ({ label: MISSING_LABEL[section], section }))
  if (!empty.has('kontakty') && !e.phone) missing.push({ label: 'телефону', section: 'kontakty' })
  return {
    id: s.id,
    slug: s.slug,
    ...cabinetTitle(s, l.city),
    filled: KABINET_SECTIONS.length - empty.size,
    total: KABINET_SECTIONS.length,
    missing,
    reviewSince: cs ? iso(cs.createdAt) : null,
    savedAt: cs ? iso(cs.updatedAt) : null,
    sections,
    profileUrl: `/vyrobnyky/${s.slug}`,
  }
}

/**
 * Heading and kicker of a studio in the cabinet: «Студія кераміки «Осоння» (Суми)» reads as kicker «Студія кераміки · Суми»
 * and name «Осоння», so an owner of two branches tells them apart by the city. Names without «…» keep displayName().
 */
function cabinetTitle(s: { name: string; shortName: string | null; type: string | null }, city: string | null) {
  const full = displayName(s)
  const m = /^(.*?)\s*«(.+)»/.exec(full)
  const kind = m?.[1]?.trim() || TYPE_LABEL[(s.type ?? 'other') as keyof typeof TYPE_LABEL]
  return { name: m ? m[2]! : full, kicker: [kind, city].filter(Boolean).join(' · ') }
}

/** The cabinet overview of one studio, or null when it isn't the owner's. */
export async function studioSummary(db: Db, userId: string, slug: string): Promise<StudioSummary | null> {
  const l = await loadOwned(db, userId, slug)
  return l ? summarize(l) : null
}

/** The owner's studios with their state, in the order set for the owner. */
export async function ownerStudioSummaries(db: Db, userId: string): Promise<StudioSummary[]> {
  const rows = await db
    .select({ s: studios, city: cities.name })
    .from(studioOwner)
    .innerJoin(studios, eq(studios.id, studioOwner.studioId))
    .leftJoin(cities, eq(cities.id, studios.cityId))
    .where(eq(studioOwner.userId, userId))
    .orderBy(asc(studioOwner.position), asc(studios.name))
  return Promise.all(rows.map(async (r) => summarize(await loadState(db, r.s, r.city))))
}

// ---------------------------------------------------------------- section pages

/** The studio's photos as the cabinet shows them (effective order; small variants). */
export async function photoList(db: Db, l: Loaded): Promise<KabinetPhoto[]> {
  const ids = effective(l).photos
  const rows = ids.length ? await db.select().from(media).where(inArray(media.id, ids)) : []
  const byId = new Map(rows.map((m) => [m.id, m]))
  const mine = new Set(l.cs?.newMediaIds ?? [])
  const published = new Set(l.photoIds)
  return ids.flatMap((id) => {
    const m = byId.get(id)
    if (!m) return []
    const own = mine.has(id)
    const alt = t(m.alt).trim()
    return [
      {
        id,
        url: mediaUrl(m.variants?.small?.file ?? m.fileName) ?? '',
        caption: own && alt && alt !== defaultAlt(l.s) ? alt : null,
        canCaption: own && m.status === 'pending',
        state: m.status === 'pending' || !published.has(id) ? ('review' as const) : ('live' as const),
      },
    ]
  })
}

async function buildSection<S extends KabinetSection>(db: Db, l: Loaded, section: S): Promise<SectionPage<S>> {
  const e = effective(l)
  const page = (values: SectionValues[KabinetSection], extras: object = {}) => ({ studio: summarize(l), section, values, extras }) as unknown as SectionPage<S>
  switch (section as KabinetSection) {
    case 'pro-studiyu':
      return page({ ownerAbout: e.ownerAbout, ownerNews: e.ownerNews, ownerQuote: e.ownerQuote }, { publicNow: t(l.s.publicDescription || l.s.summary) })
    case 'posluhy':
      return page({ services: e.services, products: e.products })
    case 'tsiny':
      return page({ prices: e.prices })
    case 'biznes':
      return page(e.b2b)
    case 'kontakty':
      return page({ address: e.address, phone: e.phone, email: e.email, website: e.website, instagram: e.instagram, instagramPosts: e.instagramPosts })
    case 'foto':
      return page({ photos: await photoList(db, l) })
  }
}

/** One section's form values (published data with the open proposal on top), or null when the studio isn't the owner's. */
export async function sectionPage<S extends KabinetSection>(db: Db, userId: string, slug: string, section: S): Promise<SectionPage<S> | null> {
  const l = await loadOwned(db, userId, slug)
  return l ? buildSection(db, l, section) : null
}

// ---------------------------------------------------------------- writes

/**
 * Merges `patch` (change-set keys) into the studio's open change set, creating it when there is none. Other keys stay.
 * Photo actions pass `photos` too: it gets the list as it is under the lock (the open proposal, else the published
 * photos), so an upload and a reorder that overlap never overwrite each other; it returns the new list, or null to leave
 * everything as it is, and may throw Invalid. They also set the time the editor is told (10 minutes after the last one).
 * Returns the change set id (null when `photos` changed nothing and there is no open one).
 */
export async function mergeIntoChangeSet(
  db: Db,
  l: Loaded,
  userId: string,
  patch: Record<string, unknown>,
  opts: { photos?: (current: number[], open: typeof changeSets.$inferSelect | undefined) => number[] | null; newMediaIds?: number[]; photosNotify?: boolean; changes: Changes },
): Promise<number | null> {
  const actor: Actor = { id: userId, source: 'kabinet' }
  const notify = opts.photosNotify ? { photosNotifyAt: sql`now() + interval '10 minutes'` } : {}
  return db.transaction(async (tx) => {
    const [open] = await tx.select().from(changeSets).where(and(eq(changeSets.studioId, l.s.id), eq(changeSets.status, 'pending'))).for('update').limit(1)
    let write = patch
    let changes = opts.changes
    if (opts.photos) {
      const proposed = open ? normalizeProposed(open.proposed as Record<string, unknown>).photos : undefined
      const published = async () => (await tx.select({ id: studioPhotos.mediaId }).from(studioPhotos).where(eq(studioPhotos.studioId, l.s.id)).orderBy(asc(studioPhotos.position))).map((p) => p.id)
      const current = [...new Set((proposed as number[] | undefined) ?? (await published()))]
      const next = opts.photos(current, open)
      if (!next) return open?.id ?? null
      write = { ...patch, photos: next }
      changes = { ...changes, photos: { from: current, to: next } }
    }
    let id: number
    if (open) {
      await tx
        .update(changeSets)
        .set({
          proposed: { ...(open.proposed as Record<string, unknown>), ...write },
          newMediaIds: [...new Set([...open.newMediaIds, ...(opts.newMediaIds ?? [])])],
          baseRevision: l.s.revision,
          authorId: userId,
          updatedAt: sql`now()`,
          ...notify,
        })
        .where(eq(changeSets.id, open.id))
      id = open.id
    } else {
      const [row] = await tx
        .insert(changeSets)
        .values({ studioId: l.s.id, authorId: userId, status: 'pending', baseRevision: l.s.revision, proposed: write, newMediaIds: opts.newMediaIds ?? [], ...notify })
        .returning({ id: changeSets.id })
      id = row!.id
    }
    await audit(tx, actor, 'change_set', id, open ? 'update' : 'create', { studio: { from: null, to: l.s.slug }, ...changes })
    return id
  })
}

const monthYear = (d = new Date()) => `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

/** Validates a section and turns it into change-set keys; throws FieldErrors. */
function parseSection(section: Saveable, data: unknown, l: Loaded, e: Effective): Record<string, unknown> {
  const parsed =
    section === 'pro-studiyu' ? ownerAboutSection.safeParse(data)
    : section === 'posluhy' ? ownerServicesSection.safeParse(data)
    : section === 'tsiny' ? ownerPricesSection.safeParse(data)
    : section === 'biznes' ? ownerB2bSection.safeParse(data)
    : ownerContactsSection({ phone: e.phone, email: e.email, website: e.website, instagram: e.instagram }).safeParse(data)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const i of parsed.error.issues) fields[i.path.join('.') || 'form'] ??= i.message
    throw new FieldErrors(fields)
  }
  if (section === 'biznes') return { b2b: parsed.data }
  if (section !== 'tsiny') return parsed.data as Record<string, unknown>
  // A price line left as it was keeps its source; new or edited lines are «від студії, MM.YYYY».
  const ownerSource = `від студії, ${monthYear()}`
  const known = [...((effectiveValue(l, 'prices') as Price[] | null) ?? []), ...l.prices]
  const prices = (parsed.data as { prices: { text: string; date: string }[] }).prices.map((p) => {
    const old = known.find((x) => x.text === p.text)
    return { text: p.text, dateText: p.date || null, source: old ? old.source : ownerSource }
  })
  return { prices }
}

/** Telegram note for the editor about a text section; photos have their own delayed note (kabinetPhotos.ts). */
async function tellEditor(l: Loaded, ownerName: string, section: Saveable, part: Record<string, unknown>, changed: FieldKey[], changeSetId: number) {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID
    if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return
    const about = changed.includes('ownerAbout') && part.ownerAbout
    const news = changed.includes('ownerNews') ? String(part.ownerNews ?? '') : ''
    const text = [
      `Зміни від власника: ${l.s.name} — ${KABINET_SECTION_TITLE[section]}`,
      `${ownerName}${about ? ', є текст «своїми словами» — перепишіть голосом сайту' : ''}`,
      ...(news ? ['', 'Новини від студії (вийдуть як є після «Опублікувати»):', news] : []),
    ].join('\n')
    await tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, reply_markup: { inline_keyboard: ownerEditKeyboard(l.s.id, changeSetId) } })
  } catch (err) {
    console.error('Telegram notification error', String(err).slice(0, 200))
  }
}

/**
 * Saves one section as part of the studio's pending change set (created or updated; the section's keys only).
 * Nothing is written, and the editor not told, when the values equal what is already there. Throws Forbidden for a
 * studio that isn't the owner's and FieldErrors for values that fail validation.
 */
export async function saveSection(
  db: Db,
  input: { userId: string; ownerName: string; slug: string; section: Saveable; data: unknown },
): Promise<SaveOk> {
  const l = await loadOwned(db, input.userId, input.slug)
  if (!l) throw new Forbidden('Немає доступу до цієї студії.')
  const part = parseSection(input.section, input.data, l, effective(l))
  const next = normalizeProposed(part)
  const changed = SECTION_KEYS[input.section].filter((k) => !same(effectiveValue(l, k), next[k]))
  let current = l
  if (changed.length) {
    const id = await mergeIntoChangeSet(db, l, input.userId, part, { changes: { section: { from: null, to: input.section }, fields: { from: null, to: changed } } })
    await tellEditor(l, input.ownerName, input.section, part, changed, id!)
    current = (await loadOwned(db, input.userId, input.slug))!
  }
  const page = await buildSection(db, current, input.section)
  return { ok: true, changed: changed.length > 0, studio: page.studio, values: page.values }
}
