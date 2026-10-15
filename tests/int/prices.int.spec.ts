import { describe, expect, it } from 'vitest'

import type { StudioCard } from '@/lib/catalog'
import { CATEGORIES, scopeSpan, studioValues } from '@/lib/priceIndex'
import { publicPrices, splitSource } from '@/lib/present'

const studio = (id: number, prices: string[]): StudioCard =>
  ({ id, name: `Студія ${id}`, slug: `s${id}`, type: 'studio', prices: prices.map((text) => ({ text })), cityDoc: null }) as unknown as StudioCard

const cat = (key: string) => CATEGORIES.find((c) => c.key === key)!

describe('price categories', () => {
  it('a kids class is not an adult single-class price', () => {
    expect(cat('group').match('Дитячий МК, 6–12 років — 500 грн (сайт, 2026)')).toBe(false)
    expect(cat('kids').match('Дитячий МК, 6–12 років — 500 грн (сайт, 2026)')).toBe(true)
  })
  it('group totals and couples stay out of «з особи»', () => {
    expect(cat('group').match('МК для групи до 10 осіб — 11 000 грн')).toBe(false)
    expect(cat('group').match('МК для двох — 1 900 грн')).toBe(false)
    expect(cat('couple').match('МК для двох — 1 900 грн')).toBe(true)
    expect(cat('group').match('Груповий МК, 2,5 год — 650 грн/особа (сайт, 2026)')).toBe(true)
  })
  it('courses are not single classes', () => {
    expect(cat('group').match('Курс гончарства, 8 занять — 6 400 грн')).toBe(false)
    expect(cat('course').match('Курс гончарства, 8 занять — 6 400 грн')).toBe(true)
  })
})

describe('price lines from the audit (15.10.2026) stay out of the wrong category', () => {
  const keys = (t: string) => CATEGORIES.filter((c) => c.match(t)).map((c) => c.key)
  it('painting, candles, wood, textile and drawing are not a ceramics class', () => {
    expect(keys('Петриківський розпис, 2 год, дерев\'яний виріб включено — 1 600 грн (Instagram, 08.2026)')).toEqual([])
    expect(keys('МК зі свічкарства, діти 6+ — 450–550 грн (Діти в місті, 2026)')).toEqual([])
    expect(keys('Заняття з малювання (digital art на планшеті), діти — 300 грн (Instagram, 2026)')).toEqual([])
    expect(keys('розпис шоперів — 450 грн; малювання — 300 грн (Telegram, 2026)')).toEqual([])
    expect(keys('МК живопис «вільна тема» (полотно 40×40) — 1 300 грн (Instagram, 2026)')).toEqual([])
  })
  it('add-ons, hourly rates and deposits are not a class price', () => {
    expect(keys('Додаткова година на МК (за наявності місця) — 300 грн (Instagram, 2026)')).toEqual([])
    expect(keys('МК (гончарний круг, ліплення, розпис) / навчання — 500 грн/год (Prom, 2026)')).toEqual([])
    expect(keys('Заняття, 1 академічна година — 300 грн (сайт, 2026)')).toEqual([])
    expect(cat('group').pick('МК «Один день» (ліплення або коло, 2 год) — ціна в хайлайті, передоплата 500 грн')).toBe(null)
  })
  it('a family class is not a kids class, a certificate is not a course', () => {
    expect(keys('Сімейний МК (дорослий + дитина) — 1 700 грн (сайт, 2026)')).toEqual([])
    expect(keys('Подарунковий сертифікат на МК, дійсний 6 місяців — від 950 грн (Instagram, 2026)')).toEqual(['cert'])
  })
  it('a price for two is the total for two', () => {
    expect(cat('couple').pick('МК «Доторкнись» на гончарному колі, 80 хв, для двох — 1 100 грн/особа')).toBe(2200)
    expect(cat('couple').pick('МК гончарства з випалом — 1 750 грн / 3 400 грн для двох')).toBe(3400)
    expect(cat('couple').pick('МК кераміки, 1,5 год — 1 200 грн (1 особа), 2 200 грн (2 особи)')).toBe(2200)
    expect(cat('couple').pick('Гончарний МК, 2 год — 2 800 грн за 2 особи, кожен наступний учасник +1 400 грн')).toBe(2800)
    expect(keys('Гончарний МК, 2 год — 2 800 грн за 2 особи, кожен наступний учасник +1 400 грн')).toEqual(['couple'])
    expect(keys('МК «Ліпка + розпис», 2,5 год: індивідуально (до 2 осіб) — 1 500 грн/особа')).toEqual(['private'])
  })
  it('a product with «розпис» in its name is not a class; dog bowls and HoReCa are not retail plates', () => {
    expect(keys('Ялинкова прикраса з косівським розписом, понад 40 форм — 190–445 грн (Instagram, 2026)')).toEqual([])
    expect(keys('TAKSEL Slow Bowl (керамічна миска для собак) — 1 200 грн (сайт, 2026)')).toEqual([])
    expect(keys('HoReCa: тарілки 20–30 см — 330–540 грн (сайт, 2026)')).toEqual([])
    expect(keys('Чашка мрії, 2 год — 1 000–1 900 грн (сайт, 2026)')).not.toContain('cup')
  })
})

describe('price lines', () => {
  it('split the source hint and year', () => {
    expect(splitSource('МК 900 грн (Instagram, 10.2026)')).toEqual({ text: 'МК 900 грн', source: 'Instagram, 10.2026', year: 2026 })
  })
  it('drop donations, internal notes and lines from before 2023', () => {
    const s = studio(1, ['МК за донат від 150 грн', 'медіана ~155 EUR, переглянуто', 'МК 800 грн (сайт, 2021)', 'МК 900 грн (сайт, 2026)'])
    expect(publicPrices(s as never).map((p) => p.text)).toEqual(['МК 900 грн'])
  })
})

describe('one value per studio', () => {
  it('a studio counts once, with a price it really quotes (lower median, never an average of two)', () => {
    const two = studio(3, ['МК на колі — 950 грн/особа (сайт, 2026)', 'МК ліплення — 1 300 грн/особа (сайт, 2026)'])
    expect(studioValues([two]).values.get('group')?.[0]?.value).toBe(950)
    const undated = studio(4, ['МК — 300 грн/особа'])
    expect(studioValues([undated]).values.get('group')).toBeUndefined()
  })
  it('a studio with many lines counts once (its own median)', () => {
    const many = studio(1, ['МК на колі — 800 грн/особа (сайт, 2026)', 'МК ліплення — 1 000 грн/особа (сайт, 2026)', 'МК розпис — 1 200 грн/особа (сайт, 2026)'])
    const one = studio(2, ['Груповий МК — 2 000 грн/особа (сайт, 2026)'])
    const { values } = studioValues([many, one])
    expect(values.get('group')?.map((x) => x.value).sort()).toEqual([1000, 2000])
    expect(scopeSpan([many, one])?.text).toBe(`${(1000).toLocaleString('uk-UA')} і ${(2000).toLocaleString('uk-UA')} грн`)
  })
})
