// Map rows of the new `app` schema back to the document shape Payload returns today (payload-types `Studio`,
// `City`, `Request`, `Claim`). Used by the migration verifier now and by the public catalog in phase 3, so the
// public pages and lib/* keep working unchanged when the data source switches.
import type { InferSelectModel } from 'drizzle-orm'

import type { cities, claims, requests, studioPrices, studios } from './db/schema'

type StudioRow = InferSelectModel<typeof studios>
type PriceRow = InferSelectModel<typeof studioPrices>
type CityRow = InferSelectModel<typeof cities>
type RequestRow = InferSelectModel<typeof requests>
type ClaimRow = InferSelectModel<typeof claims>

const iso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null)
const texts = (xs: string[] | null | undefined) => (xs ?? []).map((text) => ({ text }))
const urls = (xs: string[] | null | undefined) => (xs ?? []).map((url) => ({ url }))

export function toLegacyCity(c: CityRow) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    oblast: c.oblast,
    population: c.population,
    isOver100k: c.isOver100k,
    updatedAt: iso(c.updatedAt),
    createdAt: iso(c.createdAt),
  }
}

export function toLegacyStudio(s: StudioRow, prices: PriceRow[], photoIds: number[]) {
  return {
    id: s.id,
    name: s.name,
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
    ownerQuote: s.ownerQuote,
    ownerQuoteApproved: s.ownerQuoteApproved,
    recentNote: s.recentNote,
    description: s.descriptionInternal,
    formats: s.formats,
    services: texts(s.services),
    products: texts(s.products),
    prices: [...prices].sort((a, b) => a.position - b.position).map((p) => ({ text: p.text, source: p.source, date: p.dateText })),
    photos: photoIds,
    instagram: s.instagram,
    website: s.website,
    facebook: s.facebook,
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
    _status: s.visibility === 'public' ? ('published' as const) : ('draft' as const),
  }
}

export function toLegacyRequest(r: RequestRow, studiosSent: number[]) {
  return {
    id: r.id,
    what: r.what,
    details: r.details,
    studioName: r.studioName,
    studioLinks: r.studioLinks,
    photoConsent: r.photoConsent,
    quantity: r.quantity,
    deadline: r.deadline,
    budgetPerItem: r.budgetPerItem,
    city: r.city,
    logo: r.logo,
    contactName: r.contactName,
    contactPhoneOrTelegram: r.contactPhoneOrTelegram,
    contactEmail: r.contactEmail,
    sourcePage: r.sourcePage,
    status: r.status,
    studiosSent,
    dealAmount: r.dealAmountKop == null ? null : r.dealAmountKop / 100,
    commission5: r.commissionKop == null ? null : r.commissionKop / 100,
    notes: r.notes,
    updatedAt: iso(r.updatedAt),
    createdAt: iso(r.createdAt),
  }
}

export function toLegacyClaim(c: ClaimRow, studioId: number | null, otherStudios: number[], legacyOwnerId: (userId: string | null) => number | null) {
  return {
    id: c.id,
    status: c.status,
    rejectReason: c.rejectReason,
    studio: studioId,
    otherStudios,
    name: c.name,
    contact: c.contact,
    represents: c.represents,
    linkToOwner: legacyOwnerId(c.linkToOwnerId),
    owner: legacyOwnerId(c.ownerId),
    notes: c.notes,
    updatedAt: iso(c.updatedAt),
    createdAt: iso(c.createdAt),
  }
}
