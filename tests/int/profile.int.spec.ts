import { describe, expect, it } from 'vitest'

import { confirmedForCompanies, confirmedForVenues, offersMasterClasses, type StudioCard } from '@/lib/catalog'
import { dataDate, splitSource, withoutPriceMention } from '@/lib/present'
import { acceptsRequests, dedupePrices, groupPrices, offerItem, relatedStudios } from '@/lib/profile'

const lines = (...raw: string[]) => raw.map(splitSource)
const texts = (ls: { text: string }[]) => ls.map((l) => l.text)

describe('profile «Послуги»: research notes stay off the page (audit 15.10.2026)', () => {
  it('drops the source bracket, keeps the year of an old fact', () => {
    expect(offerItem('Сертифікати на будь-яку суму, дійсні 3 місяці (Instagram, 04.2025)')).toBe('Сертифікати на будь-яку суму, дійсні 3 місяці')
    expect(offerItem('гончарство / ліплення з глини (за видачею пошуку)')).toBe('гончарство / ліплення з глини')
    expect(offerItem('майстер-класи (за list.in.ua)')).toBe('майстер-класи')
    expect(offerItem('заняття / майстер-класи (Paint & Pottery Studio за TripAdvisor)')).toBe('заняття / майстер-класи')
    expect(offerItem('робота з порцеляною (хайлайт «Фарфор»)')).toBe('робота з порцеляною')
    expect(offerItem('Посуд для ресторанів: Pretty High Kitchen (Instagram, 12.2020)')).toBe('Посуд для ресторанів: Pretty High Kitchen (2020)')
  })
  it('drops schedules, hours, directions and contacts', () => {
    expect(offerItem('Розклад: щодня 11:00, 13:00, 16:00 (Instagram, 06.2026)')).toBe('')
    expect(offerItem('Контакти студії: +38 (044) 279 05 05 (Instagram, 05.2026)')).toBe('')
    expect(offerItem('Корпоративи для 5–150 учасників; запит: studio@gmail.com (Instagram, 09.2025)')).toBe('Корпоративи для 5–150 учасників')
    expect(offerItem('графіка')).toBe('графіка')
  })
})

describe('profile prices: one line per offer, in the right group', () => {
  it('a class quoted again in other words, or inside a summary line, shows once', () => {
    const out = dedupePrices(
      lines(
        'МК ліплення (2 год + глазурування) — 1 700 грн (сайт, 2026)',
        'МК на крузі, 2 год — 1 700 грн (1 особа) / 3 200 грн (2 особи) (сайт, 2026)',
        'Сімейний МК (дорослий + дитина) — 1 700 грн (сайт, 2026)',
        'МК ручне ліплення — 1 700 грн; гончарний круг — 1 700 грн, для двох 3 200 грн; сімейний — 1 700 грн (сайт, 2026)',
        'Двоетапний МК на крузі — 1 700–3 200 грн (сайт, 2026)',
      ),
    )
    expect(texts(out)).toEqual(['МК ліплення (2 год + глазурування) — 1 700 грн', 'МК на крузі, 2 год — 1 700 грн (1 особа) / 3 200 грн (2 особи)', 'Сімейний МК (дорослий + дитина) — 1 700 грн'])
  })
  it('different things at the same price stay; a certificate is not a duplicate of the class', () => {
    const out = dedupePrices(lines('Чашка — 450 грн (сайт, 2026)', 'Тарілка — 450 грн (сайт, 2026)', 'Ліплення, 2 год — 1 700 грн (сайт, 2026)', 'Сертифікат на ліплення, 2 год — 1 700 грн (сайт, 2026)'))
    expect(out).toHaveLength(4)
  })
  it('an older listing goes when the studio gives newer prices itself', () => {
    const out = dedupePrices(lines('МК — 1 200 грн (сайт, 2026)', 'МК 1 500–3 300 грн (tykyiv.com)', 'Сертифікат — 1 000 грн (KAVA, 2026)', 'Ваза — 800 грн'))
    expect(texts(out)).toEqual(['МК — 1 200 грн', 'Сертифікат — 1 000 грн', 'Ваза — 800 грн'])
  })
  it('groups certificates, services and classes by what they are', () => {
    const g = Object.fromEntries(
      groupPrices(
        lines(
          'Подарунковий сертифікат, дійсний 6 місяців — 1 750 грн (сайт, 2026)',
          'Фотосесія в гончарній студії, 60 хв — 1 400 грн (Instagram, 10.2025)',
          'Коворкінг — 4 700 грн/2 тижні, 5 900 грн/місяць (сайт, 2026)',
          'Керамічний посуд, 3 год — 1 750 грн (сайт, 2026)',
          'Гончарний круг Rad-Pro BASE — 34 700 грн (Prom, 2026)',
          'Двоетапний МК, група до 3 осіб — 1 700 грн (сайт, 2026)',
        ),
      ).map(([k, v]) => [k, texts(v)]),
    )
    expect(g['Сертифікати']).toHaveLength(1)
    expect(g['Коворкінг і послуги']).toEqual(['Фотосесія в гончарній студії, 60 хв — 1 400 грн', 'Коворкінг — 4 700 грн/2 тижні, 5 900 грн/місяць'])
    expect(g['Майстер-класи']).toEqual(['Керамічний посуд, 3 год — 1 750 грн', 'Двоетапний МК, група до 3 осіб — 1 700 грн'])
    expect(g['Вироби']).toEqual(['Гончарний круг Rad-Pro BASE — 34 700 грн'])
  })
})

describe('profile lead and date', () => {
  it('«Є прайс» goes, the rest of the sentence stays', () => {
    expect(withoutPriceMention('Доставляє по Україні. Є прайс.')).toBe('Доставляє по Україні.')
    expect(withoutPriceMention('Є прайс; записатися можна через Instagram.')).toBe('Записатися можна через Instagram.')
    expect(withoutPriceMention('Запис через Instagram і Facebook, є прайс.')).toBe('Запис через Instagram і Facebook.')
    expect(withoutPriceMention('Є прайс і подарункові сертифікати; розклад — на сайті.')).toBe('Є подарункові сертифікати; розклад — на сайті.')
    expect(withoutPriceMention('Є подарункові сертифікати й прайс.')).toBe('Є подарункові сертифікати.')
  })
  it('the data date is the newest dated fact, not today', () => {
    const now = Date.UTC(2026, 9, 15)
    expect(dataDate({ description: 'Член НСХУ з 1993 року, виставка 2018 року.' } as never, now)?.label).toBe('2018')
    expect(dataDate({ description: 'МК — 2025 грн.', activity: { lastPostDate: '2021-03-10T00:00:00Z' } } as never, now)?.label).toBe('березень 2021')
    expect(dataDate({ description: 'Без дат.' } as never, now)).toBeNull()
  })
})

describe('«Інші студії та майстри»', () => {
  const kyiv = { slug: 'kyiv', name: 'Київ', id: 1 }
  const st = (slug: string, extra: Partial<StudioCard> = {}) => ({ id: slug.length, slug, name: slug, type: 'studio', cityDoc: kyiv, formats: [], ...extra }) as unknown as StudioCard
  it('a profile the studio names comes first, then the same kind; never itself or another city', () => {
    const me = st('me', { description: 'Співзасновниця студії Vohon.', formats: ['wheel'] })
    const pool = [st('a-shop', { type: 'shop' }), st('b-wheel', { formats: ['wheel'] }), st('vohon', { shortName: 'Vohon' }), st('lviv', { cityDoc: { slug: 'lviv', name: 'Львів', id: 2 } } as never), me]
    const out = relatedStudios(me, pool).map((x) => x.slug)
    expect(out[0]).toBe('vohon')
    expect(out).not.toContain('me')
    expect(out).not.toContain('lviv')
    expect(out.indexOf('b-wheel')).toBeLessThan(out.indexOf('a-shop'))
  })
})

describe('who gets the request form (owner, 15.10.2026)', () => {
  const card = (extra: Partial<StudioCard>) => ({ id: 1, slug: 's', name: 's', type: 'studio', status: 'active', instagram: 'https://instagram.com/s', formats: ['wheel'], cityDoc: null, ...extra }) as unknown as StudioCard
  it('an open studio, brand or maker with a live channel', () => {
    expect(acceptsRequests(card({}))).toBe(true)
    expect(acceptsRequests(card({ type: 'maker', instagram: null, website: 'https://maker.ua', formats: ['logo'] }))).toBe(true)
  })
  it('not without Instagram, site, phone, e-mail or Facebook', () => {
    expect(acceptsRequests(card({ instagram: null }))).toBe(false)
  })
  it('not for shops, schools, heritage, closed or inactive profiles', () => {
    for (const type of ['shop', 'school', 'legacy'] as const) expect(acceptsRequests(card({ type }))).toBe(false)
    expect(acceptsRequests(card({ status: 'closed' }))).toBe(false)
    expect(acceptsRequests(card({ status: 'unclear', unverified: true }))).toBe(false)
  })
})

describe('business badges rest on the b2b terms, not on format tags', () => {
  const card = (extra: Partial<StudioCard>) => ({ id: 1, slug: 's', name: 's', type: 'brand', status: 'active', formats: ['horeca', 'logo'], cityDoc: null, ...extra }) as unknown as StudioCard
  it('a tag alone gives no badge; a sourced term does', () => {
    expect(confirmedForVenues(card({}))).toBe(false)
    expect(confirmedForCompanies(card({}))).toBe(false)
    expect(confirmedForVenues(card({ b2b: { worksWithHoreca: true } }))).toBe(true)
    expect(confirmedForCompanies(card({ b2b: { worksWithCorporate: true } }))).toBe(true)
  })
})

describe('a course for one group is not a place to book a class (16.10.2026)', () => {
  const school = (summary: string) => ({ type: 'school', summary, formats: ['courses', 'wheel'] }) as unknown as StudioCard
  it('«Гончарство в темряві» stays out of master-class lists, an open school stays in', () => {
    expect(offersMasterClasses(school('Безоплатний 45-денний курс гончарства для ветеранів, які втратили зір на війні.'))).toBe(false)
    expect(offersMasterClasses(school('Школа кераміки: курси для дорослих і дітей.'))).toBe(true)
  })
})
