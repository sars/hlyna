// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { claimCreate, ownerStudioEdit, requestCreate, studioEdit } from '../../src/shared/schemas'

describe('requestCreate', () => {
  it('needs a way to reply', () => {
    const r = requestCreate.safeParse({ what: 'tableware', details: 'Чашки' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Вкажіть телефон, Telegram або email, щоб ми могли відповісти.')
  })
  it('trims, caps and nulls empty strings', () => {
    const r = requestCreate.parse({ what: 'logo-mugs', contactPhoneOrTelegram: '  @studio  ', details: 'x'.repeat(6000), contactEmail: '' })
    expect(r.contactPhoneOrTelegram).toBe('@studio')
    expect(r.details).toHaveLength(5000)
    expect(r.contactEmail).toBeNull()
  })
  it('rejects a bad email and a too-short phone', () => {
    expect(requestCreate.safeParse({ what: 'other', contactEmail: 'nope' }).success).toBe(false)
    expect(requestCreate.safeParse({ what: 'other', contactPhoneOrTelegram: '12' }).success).toBe(false)
  })
  it('rejects a filled honeypot', () => {
    expect(requestCreate.safeParse({ what: 'other', contactEmail: 'a@b.ua', website2: 'http://spam' }).success).toBe(false)
  })
  it('rejects an unknown request type', () => {
    expect(requestCreate.safeParse({ what: 'spam', contactEmail: 'a@b.ua' }).success).toBe(false)
  })
})

describe('claimCreate', () => {
  it('requires representing the studio', () => {
    const r = claimCreate.safeParse({ name: 'Ольга', contact: '@o', studio: 'katartsys', represents: false })
    expect(r.success).toBe(false)
  })
  it('keeps at most five other studios', () => {
    const r = claimCreate.parse({ name: 'Ольга', contact: '@o', studio: 'a', represents: true, otherStudios: ['b', 'c', 'd', 'e', 'f', 'g', ''] })
    expect(r.otherStudios).toEqual(['b', 'c', 'd', 'e', 'f'])
  })
})

describe('ownerStudioEdit (owner whitelist)', () => {
  it('drops fields owners may not write', () => {
    const r = ownerStudioEdit.parse({ ownerAbout: 'Про нас', publicDescription: 'hack', status: 'closed', visibility: 'public' } as never)
    expect(r).not.toHaveProperty('publicDescription')
    expect(r).not.toHaveProperty('status')
    expect(r.ownerAbout).toBe('Про нас')
  })
  it('normalises URLs and keeps only Instagram post links, max 3', () => {
    const r = ownerStudioEdit.parse({
      website: 'studio.ua',
      instagramPosts: [
        'https://www.instagram.com/p/AAA/',
        'https://www.instagram.com/reel/BBB/',
        'https://evil.example/p/CCC/',
        'https://www.instagram.com/p/DDD/',
        'https://www.instagram.com/p/EEE/',
      ],
    })
    expect(r.website).toBe('https://studio.ua/')
    expect(r.instagramPosts).toEqual(['https://www.instagram.com/p/AAA/', 'https://www.instagram.com/reel/BBB/', 'https://www.instagram.com/p/DDD/'])
  })
  it('keeps at most 40 non-empty price lines', () => {
    const r = ownerStudioEdit.parse({ prices: Array.from({ length: 50 }, (_, i) => ({ text: i % 5 ? `МК ${i} — 900 грн` : '' })) })
    expect(r.prices).toHaveLength(40)
  })
})

describe('studioEdit (panel)', () => {
  it('validates slugs and formats', () => {
    const base = {
      name: 'Студія',
      slug: 'studiia',
      type: 'studio',
      status: 'active',
      visibility: 'public',
      confidence: null,
      cityId: 1,
      oblast: null,
      address: null,
      geoLat: null,
      geoLng: null,
      geoPrecision: null,
      summary: null,
      publicDescription: null,
      recentNote: null,
      descriptionInternal: null,
      ownerQuoteApproved: null,
      instagram: null,
      website: null,
      facebook: null,
      phone: null,
      email: null,
      b2bMinOrder: null,
      b2bLeadTime: null,
      b2bFoodSafe: null,
      b2bDishwasherSafe: null,
      b2bWorksWithHoreca: null,
      b2bWorksWithCorporate: null,
      consentPhotos: null,
      consentRequests: null,
      consentNotes: null,
      alternateNames: [],
      formats: ['wheel'],
      services: [],
      products: [],
      salesChannels: [],
      otherLinks: [],
      sources: [],
      instagramPosts: [],
      b2bLogoMethods: [],
      prices: [],
      photoIds: [],
      expectedRevision: 3,
    }
    expect(studioEdit.safeParse(base).success).toBe(true)
    expect(studioEdit.safeParse({ ...base, slug: 'Студія' }).success).toBe(false)
    expect(studioEdit.safeParse({ ...base, formats: ['karaoke'] }).success).toBe(false)
  })
})
