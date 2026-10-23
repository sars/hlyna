import type { KabinetSection } from './options'

// What the studio cabinet's pages and its API exchange. The server builds these from the published studio with the
// owner's open change set on top (src/server/services/kabinet.ts); the client sends back one section at a time.

/** live — the section matches the published profile; review — the open change set changes it; missing — empty. */
export type SectionState = 'live' | 'review' | 'missing'

export type SectionSummary = {
  key: KabinetSection
  title: string
  state: SectionState
  /** What is there, in a few words: «7 послуг, 4 вироби», «5 цін · жовтень 2026», «Адреса, сайт, Instagram, email · без телефону». */
  line: string
}

export type StudioSummary = {
  id: number
  slug: string
  /** The heading: the part in «…» of displayName() («Осоння»), else displayName(). */
  name: string
  /** «Студія кераміки · Суми» (type and city; either may be absent). */
  kicker: string
  filled: number
  total: number
  /** What is missing, as genitive nouns that read after «Бракує:»: «фото», «умов для бізнесу», «телефону». */
  missing: { label: string; section: KabinetSection }[]
  /** ISO time the open change set was created (null when nothing is on review). */
  reviewSince: string | null
  /** ISO time of the owner's last save to the open change set (null when nothing is on review). */
  savedAt: string | null
  sections: SectionSummary[]
  profileUrl: string
  /** Shop orders not yet done or cancelled. */
  openOrders: number
}

export type KabinetPhoto = {
  id: number
  /** A small variant (≈600px) for the grid. */
  url: string
  /** The owner's caption for a photo they uploaded (null when none; the editor writes the alt text on review). */
  caption: string | null
  /** Captions can be set on the owner's own uploads that are still on review. */
  canCaption: boolean
  state: 'live' | 'review'
}

export type PriceLine = { text: string; date: string; source: string }
export type B2bTerms = { minOrder: string; leadTime: string; logoMethods: string[]; foodSafe: boolean; dishwasherSafe: boolean; worksWithHoreca: boolean; worksWithCorporate: boolean }

/** Each section's editable values (what the form starts from and what it sends back, except read-only extras). */
export type SectionValues = {
  'pro-studiyu': { ownerAbout: string; ownerNews: string; ownerQuote: string }
  posluhy: { services: string[]; products: string[] }
  tsiny: { prices: PriceLine[] }
  biznes: B2bTerms
  kontakty: { address: string; phone: string; email: string; website: string; instagram: string; instagramPosts: string[] }
  foto: { photos: KabinetPhoto[] }
}

/** Read-only context a section shows next to the form. */
export type SectionExtras = {
  'pro-studiyu': { publicNow: string }
  posluhy: Record<string, never>
  tsiny: Record<string, never>
  biznes: Record<string, never>
  kontakty: Record<string, never>
  foto: Record<string, never>
}

export type SectionPage<S extends KabinetSection = KabinetSection> = {
  studio: StudioSummary
  section: S
  values: SectionValues[S]
  extras: SectionExtras[S]
}

/** POST /kabinet/api/studio/[slug]/[section] (not «foto») → 200 SaveOk | 400 SaveError | 401/403/429/503 { error }. */
/** `changed` is false when the values equal what the profile (with the open proposal) already has: nothing was written. */
export type SaveOk = { ok: true; changed: boolean; studio: StudioSummary; values: SectionValues[KabinetSection] }
/** `fields` maps a value key (e.g. «phone», «prices.2.text») to the message shown under that field. */
export type SaveError = { error: string; fields?: Record<string, string> }

// Photos (each action saves at once):
//   POST   /kabinet/api/studio/[slug]/photos          multipart: file, caption? → { photo: KabinetPhoto, photos: KabinetPhoto[], studio: StudioSummary }
//   GET    /kabinet/api/studio/[slug]/photos          → { photos, studio } (what the server has now; the page refetches after a 400)
//   PUT    /kabinet/api/studio/[slug]/photos          JSON { order: number[], known?: number[] } (the full list: remove, reorder, make main) → { photos, studio }
//          `known` = every photo id the page has a tile for, removed ones too; a photo that is on the server but in neither list
//          (uploaded meanwhile, e.g. from another tab) is kept at the end instead of being dropped.
//   PATCH  /kabinet/api/studio/[slug]/photos/[id]     JSON { caption: string } → { photo }
// Errors: 400 { error } (not an image, too big, over the limit), 401/403/429/503 { error }.
export type PhotosOk = { photos: KabinetPhoto[]; studio: StudioSummary }
