// Map rows of the `app` schema into the record shapes the public pages render (src/types/catalog: `Studio`, `City`):
// nested groups and `{text}[]` lists, so pages and lib/* never see Drizzle rows.
import type { InferSelectModel } from 'drizzle-orm'

import { webUrl } from '../lib/present'
import type { cities, studioPrices, studios } from './db/schema'

type StudioRow = InferSelectModel<typeof studios>
type PriceRow = InferSelectModel<typeof studioPrices>
type CityRow = InferSelectModel<typeof cities>

const iso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null)
const texts = (xs: string[] | null | undefined) => (xs ?? []).map((text) => ({ text }))
const urls = (xs: string[] | null | undefined) => (xs ?? []).map((url) => ({ url }))

export function toPublicCity(c: CityRow) {
  return { id: c.id, name: c.name, slug: c.slug, oblast: c.oblast }
}

export function toPublicStudio(s: StudioRow, prices: PriceRow[]) {
  return {
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    alternateNames: texts(s.alternateNames),
    type: s.type,
    city: s.cityId,
    oblast: s.oblast,
    address: s.address,
    geo: {
      lat: s.geoLat,
      lng: s.geoLng,
      precision: s.geoPrecision,
      geocodedAt: iso(s.geoGeocodedAt),
      source: s.geoSource,
    },
    summary: s.summary,
    publicDescription: s.publicDescription,
    ownerAbout: s.ownerAbout,
    ownerNews: s.ownerNews,
    ownerNewsAt: iso(s.ownerNewsAt),
    ownerQuote: s.ownerQuote,
    ownerQuoteApproved: s.ownerQuoteApproved,
    recentNote: s.recentNote,
    description: s.descriptionInternal,
    formats: s.formats,
    services: texts(s.services),
    products: texts(s.products),
    prices: [...prices].sort((a, b) => a.position - b.position).map((p) => ({ text: p.text, source: p.source, date: p.dateText })),
    // Only real URLs reach an href; a note or a name in these fields stays in the panel.
    instagram: webUrl(s.instagram),
    website: webUrl(s.website),
    facebook: webUrl(s.facebook),
    phone: s.phone,
    email: s.email,
    otherLinks: urls(s.otherLinks),
    salesChannels: texts(s.salesChannels),
    b2b: {
      minOrder: s.b2bMinOrder,
      leadTime: s.b2bLeadTime,
      logoMethods: texts(s.b2bLogoMethods),
      foodSafe: s.b2bFoodSafe,
      dishwasherSafe: s.b2bDishwasherSafe,
      worksWithHoreca: s.b2bWorksWithHoreca,
      worksWithCorporate: s.b2bWorksWithCorporate,
    },
    activity: {
      lastPostDate: iso(s.activityLastPostDate),
      posts90d: s.activityPosts90d,
      followers: s.activityFollowers,
      websiteAlive: s.activityWebsiteAlive,
      etsySales: s.activityEtsySales,
      checkedAt: iso(s.activityCheckedAt),
      instagramPosts: urls(s.instagramPosts),
    },
    consent: {
      photos: s.consentPhotos,
      requests: s.consentRequests,
      contactedAt: iso(s.consentContactedAt),
      notes: s.consentNotes,
    },
    ownerVerified: s.ownerVerified,
    slug: s.slug,
    status: s.status,
    confidence: s.confidence,
    sources: urls(s.sources),
    sourceId: s.sourceId,
    updatedAt: iso(s.updatedAt),
    createdAt: iso(s.createdAt),
  }
}
