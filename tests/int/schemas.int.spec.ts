import { describe, expect, it } from 'vitest'

import { claimCreate, ownerAboutSection, ownerContactsSection, ownerPricesSection, requestCreate, studioEdit } from '../../src/shared/schemas'

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

describe('owner sections', () => {
  it('drop fields owners may not write', () => {
    const r = ownerAboutSection.parse({ ownerAbout: 'Про нас', publicDescription: 'hack', status: 'closed', visibility: 'public' } as never)
    expect(r).not.toHaveProperty('publicDescription')
    expect(r).not.toHaveProperty('status')
    expect(r.ownerAbout).toBe('Про нас')
  })
  it('normalise URLs and keep only Instagram post links, max 3', () => {
    const r = ownerContactsSection().parse({
      website: 'studio.ua',
      instagramPosts: [
        'https://www.instagram.com/p/AAA/',
        'instagram.com/reel/BBB?igsh=x',
        '',
        'https://www.instagram.com/p/DDD/',
        'https://www.instagram.com/p/EEE/',
      ],
    })
    expect(r.website).toBe('https://studio.ua/')
    expect(r.instagramPosts).toEqual(['https://www.instagram.com/p/AAA/', 'https://www.instagram.com/reel/BBB/', 'https://www.instagram.com/p/DDD/'])
  })
  it('keep at most 40 non-empty price lines', () => {
    const r = ownerPricesSection.parse({ prices: Array.from({ length: 50 }, (_, i) => ({ text: i % 5 ? `МК ${i} — 900 грн` : '' })) })
    expect(r.prices).toHaveLength(40)
  })
  it('say which field is wrong, in Ukrainian', () => {
    const c = ownerContactsSection().safeParse({ phone: '123', email: 'a@b', website: 'not a site', instagram: 'two words', instagramPosts: ['', 'https://evil.example/p/CCC/'] })
    expect(c.success).toBe(false)
    const fields = Object.fromEntries(c.error!.issues.map((i) => [i.path.join('.'), i.message]))
    expect(Object.keys(fields).sort()).toEqual(['email', 'instagram', 'instagramPosts.1', 'phone', 'website'])
    expect(fields.phone).toMatch(/10 цифр/)
    const p = ownerPricesSection.safeParse({ prices: [{ text: 'Коло — 900 грн' }, { text: '', date: 'жовтень 2026' }, { text: '', date: '' }] })
    expect(p.error!.issues.map((i) => [i.path.join('.'), i.message])).toEqual([['prices.1.text', 'Напишіть, що саме й скільки коштує.']])
  })
  it('read phones and Instagram forgivingly', () => {
    const ok = (phone: string, instagram = '') => ownerContactsSection().parse({ phone, instagram })
    expect(ok('099 123-45-67').phone).toBe('+380 99 123 45 67')
    expect(ok('+38 (099) 123 45 67').phone).toBe('+380 99 123 45 67')
    expect(ok('380991234567').phone).toBe('+380 99 123 45 67')
    expect(ok('', '@osonnya.ceramics').instagram).toBe('https://www.instagram.com/osonnya.ceramics/')
    expect(ok('', 'osonnya').instagram).toBe('https://www.instagram.com/osonnya/')
    expect(ok('', 'https://instagram.com/osonnya?igsh=1').instagram).toBe('https://www.instagram.com/osonnya/')
    expect(ownerContactsSection({ phone: '+38 (095) 699-76-80; салон +38 (050) 670-50-22' }).parse({ phone: '+38 (095) 699-76-80; салон +38 (050) 670-50-22' }).phone).toContain('салон')
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
      ownerNews: null,
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
