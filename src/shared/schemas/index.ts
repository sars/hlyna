// Zod schemas shared by forms (client safeParse), the APIs (Hono zValidator, route handlers) and scripts.
// Messages are the Ukrainian texts the forms show.
import { z } from 'zod'

import { CONFIDENCE, GEO_PRECISION, REQUEST_WHAT, SLUG_RE, STUDIO_FORMATS, STUDIO_STATUSES, STUDIO_TYPES, STUDIO_VISIBILITY } from '../options'

// ---------- helpers
/** Trimmed string capped at `max` characters (cap, not reject — the current hooks slice silently). */
export const capped = (max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim().slice(0, max))
/** Same, but '' becomes null. */
export const cappedOrNull = (max: number) => capped(max).transform((v) => (v === '' ? null : v))
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Accepts «site.com» and «https://site.com»; returns a normalised absolute URL or '' when unparsable. */
export const looseUrl = z
  .string()
  .transform((s) => s.trim().slice(0, 300))
  .transform((s) => {
    if (!s) return ''
    try {
      return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).toString()
    } catch {
      return ''
    }
  })
const lines = (max: number, itemMax = 300) =>
  z
    .array(z.unknown())
    .default([])
    .transform((xs) => xs.map((x) => (typeof x === 'string' ? x.trim().slice(0, itemMax) : '')).filter(Boolean).slice(0, max))
export const INSTAGRAM_POST_RE = /^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/

// ---------- public request form (POST /api/requests)
export const requestCreate = z
  .object({
    what: z.enum(REQUEST_WHAT),
    details: cappedOrNull(5000).optional(),
    studioName: cappedOrNull(200).optional(),
    studioLinks: cappedOrNull(500).optional(),
    photoConsent: z.boolean().optional(),
    quantity: cappedOrNull(200).optional(),
    deadline: cappedOrNull(200).optional(),
    budgetPerItem: cappedOrNull(200).optional(),
    city: cappedOrNull(120).optional(),
    logo: z.boolean().optional(),
    contactName: cappedOrNull(200).optional(),
    contactPhoneOrTelegram: cappedOrNull(200).optional(),
    contactEmail: cappedOrNull(254).optional(),
    sourcePage: cappedOrNull(500).optional(),
    // honeypot: bots fill every input
    website2: z.string().max(0, 'Запит не прийнято.').optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    const phone = d.contactPhoneOrTelegram ?? ''
    const email = d.contactEmail ?? ''
    if (!phone && !email)
      ctx.addIssue({ code: 'custom', path: ['contactPhoneOrTelegram'], message: 'Вкажіть телефон, Telegram або email, щоб ми могли відповісти.' })
    if (phone && phone.replace(/[^\p{L}\p{N}]/gu, '').length < 4)
      ctx.addIssue({ code: 'custom', path: ['contactPhoneOrTelegram'], message: 'Перевірте телефон або Telegram.' })
    if (email && !EMAIL_RE.test(email)) ctx.addIssue({ code: 'custom', path: ['contactEmail'], message: 'Перевірте email.' })
  })

// ---------- «Це ваша студія?» claim (POST /kabinet/api/claim)
export const claimCreate = z.object({
  name: capped(120).pipe(z.string().min(1, "Вкажіть ім'я і контакт.")),
  contact: capped(160).pipe(z.string().min(1, "Вкажіть ім'я і контакт.")),
  studio: capped(200).pipe(z.string().min(1, 'Студію не знайдено.')),
  otherStudios: lines(5, 200),
  represents: z.literal(true, { error: 'Підтвердьте, що представляєте студію.' }),
  website2: z.string().max(0).optional().or(z.literal('')),
})

// ---------- owner edits in /kabinet: one schema per section; these whitelists ARE the permission (nothing else can be written
// by an owner). Forgiving on input (a nick, a bare domain, a phone with spaces), the messages are the texts under the fields.
/** Values already on the profile: left as they are when sent back unchanged (older profiles hold phones in free form). */
export type OwnerCurrent = Partial<Record<'phone' | 'email' | 'website' | 'instagram', string>>

/** A contact field: empty is fine; `normalise` returns the clean value or null (→ `message` under the field). */
const contact = (normalise: (s: string) => string | null, message: string, keep = '') =>
  capped(300).transform((v, ctx) => {
    if (!v || v === keep) return v
    const out = normalise(v)
    if (out !== null) return out
    ctx.issues.push({ code: 'custom', message, input: v })
    return z.NEVER
  })

/** 10 digits starting 0 or 12 starting 380 → «+380 99 123 45 67». */
const phoneOf = (s: string) => {
  if (!/^[\d\s\-().+]+$/.test(s)) return null
  const d = s.replace(/\D/g, '')
  const n = /^380\d{9}$/.test(d) ? d.slice(2) : /^0\d{9}$/.test(d) ? d : null
  return n && `+380 ${n.slice(1, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`
}
const emailOf = (s: string) => (EMAIL_RE.test(s) ? s : null)
const websiteOf = (s: string) => {
  const url = /\s/.test(s) ? '' : looseUrl.parse(s)
  return url && new URL(url).hostname.includes('.') ? url : null
}
const INSTAGRAM_HOST_RE = /^(www\.)?instagram\.com$/i
/** «@nick», «nick» or a profile link → https://www.instagram.com/nick/. */
const instagramOf = (s: string) => {
  if (/\s/.test(s)) return null
  const nick = (() => {
    if (!/[/]|^https?:|instagram\.com/i.test(s)) return s.replace(/^@/, '')
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
      return INSTAGRAM_HOST_RE.test(u.hostname) ? (u.pathname.split('/')[1] ?? '') : ''
    } catch {
      return ''
    }
  })()
  return /^[\w.]{1,30}$/.test(nick) && !['p', 'reel', 'reels', 'explore', 'stories'].includes(nick) ? `https://www.instagram.com/${nick}/` : null
}
/** A post or reel link, with or without www, query string and trailing slash → https://www.instagram.com/p/ID/. */
const instagramPostOf = (s: string) => {
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    const [kind, id] = u.pathname.split('/').filter(Boolean)
    const out = `https://www.instagram.com/${kind}/${id}/`
    return INSTAGRAM_HOST_RE.test(u.hostname) && INSTAGRAM_POST_RE.test(out) ? out : null
  } catch {
    return null
  }
}

export const ownerAboutSection = z.object({
  ownerAbout: capped(4000).optional().default(''),
  ownerNews: capped(600).optional().default(''),
  ownerQuote: capped(200).optional().default(''),
})
export const ownerServicesSection = z.object({ services: lines(40), products: lines(40) })
export const ownerPricesSection = z.object({
  prices: z
    .array(z.object({ text: capped(300), date: capped(60).optional().default(''), source: capped(120).optional().default('') }))
    .default([])
    .superRefine((xs, ctx) => {
      xs.forEach((p, i) => {
        if (!p.text && p.date) ctx.addIssue({ code: 'custom', path: [i, 'text'], message: 'Напишіть, що саме й скільки коштує.' })
      })
    })
    .transform((xs) => xs.filter((p) => p.text).slice(0, 40)),
})
export const ownerB2bSection = z.object({
  minOrder: capped(200).optional().default(''),
  leadTime: capped(200).optional().default(''),
  logoMethods: lines(10),
  foodSafe: z.boolean().optional().default(false),
  dishwasherSafe: z.boolean().optional().default(false),
  worksWithHoreca: z.boolean().optional().default(false),
  worksWithCorporate: z.boolean().optional().default(false),
})
export const ownerContactsSection = (current: OwnerCurrent = {}) =>
  z.object({
    address: capped(300).optional().default(''),
    phone: contact(phoneOf, 'Схоже, номер неповний. Потрібно 10 цифр, напр. +380 99 123 45 67.', current.phone).optional().default(''),
    email: contact(emailOf, 'Перевірте адресу — у ній має бути @ і крапка.', current.email).optional().default(''),
    website: contact(websiteOf, 'Вставте адресу з https://', current.website).optional().default(''),
    instagram: contact(instagramOf, 'Вставте посилання або нік без пробілів: @osonnya.ceramics.', current.instagram).optional().default(''),
    instagramPosts: z
      .array(contact(instagramPostOf, 'Вставте посилання на пост або рілс: https://www.instagram.com/p/…'))
      .default([])
      .transform((xs) => xs.filter(Boolean).slice(0, 3)),
  })

// ---------- panel: full studio edit (the schema and the editor form agree on this)
export const priceLine = z.object({ text: z.string().trim().min(1).max(300), source: z.string().trim().max(120).nullish(), dateText: z.string().trim().max(60).nullish() })
export const studioEdit = z.object({
  name: z.string().trim().min(1, 'Назва обовʼязкова.').max(200),
  shortName: z
    .string()
    .trim()
    .max(40, 'Коротка назва — до 40 символів.')
    .nullish()
    .transform((v) => v || null),
  slug: z
    .string()
    .trim()
    .regex(SLUG_RE, 'Лише латиниця, цифри й дефіси.')
    .max(160),
  type: z.enum(STUDIO_TYPES).nullable(),
  status: z.enum(STUDIO_STATUSES).nullable(),
  visibility: z.enum(STUDIO_VISIBILITY),
  confidence: z.enum(CONFIDENCE).nullable(),
  cityId: z.number().int().positive().nullable(),
  oblast: z.string().trim().max(120).nullable(),
  address: z.string().trim().max(300).nullable(),
  geoLat: z.number().min(-90).max(90).nullable(),
  geoLng: z.number().min(-180).max(180).nullable(),
  geoPrecision: z.enum(GEO_PRECISION).nullable(),
  summary: z.string().trim().max(200).nullable(),
  publicDescription: z.string().trim().max(8000).nullable(),
  recentNote: z.string().trim().max(1000).nullable(),
  ownerNews: z.string().trim().max(600).nullable(),
  descriptionInternal: z.string().trim().max(20000).nullable(),
  ownerQuoteApproved: z.boolean().nullable(),
  instagram: z.string().trim().max(300).nullable(),
  website: z.string().trim().max(300).nullable(),
  facebook: z.string().trim().max(300).nullable(),
  phone: z.string().trim().max(60).nullable(),
  email: z.string().trim().max(120).nullable(),
  b2bMinOrder: z.string().trim().max(200).nullable(),
  b2bLeadTime: z.string().trim().max(200).nullable(),
  b2bFoodSafe: z.boolean().nullable(),
  b2bDishwasherSafe: z.boolean().nullable(),
  b2bWorksWithHoreca: z.boolean().nullable(),
  b2bWorksWithCorporate: z.boolean().nullable(),
  consentPhotos: z.boolean().nullable(),
  consentRequests: z.boolean().nullable(),
  consentNotes: z.string().trim().max(2000).nullable(),
  alternateNames: z.array(z.string().trim().min(1).max(200)).max(30),
  formats: z.array(z.enum(STUDIO_FORMATS)).max(STUDIO_FORMATS.length),
  services: z.array(z.string().trim().min(1).max(300)).max(80),
  products: z.array(z.string().trim().min(1).max(300)).max(80),
  salesChannels: z.array(z.string().trim().min(1).max(300)).max(40),
  otherLinks: z.array(z.string().trim().min(1).max(500)).max(40),
  sources: z.array(z.string().trim().min(1).max(500)).max(80),
  instagramPosts: z.array(z.string().regex(INSTAGRAM_POST_RE, 'Посилання на пост Instagram (p або reel).')).max(3),
  b2bLogoMethods: z.array(z.string().trim().min(1).max(200)).max(10),
  prices: z.array(priceLine).max(80),
  photoIds: z.array(z.number().int().positive()).max(30),
  expectedRevision: z.number().int().positive(),
})
export type StudioEdit = z.output<typeof studioEdit>
