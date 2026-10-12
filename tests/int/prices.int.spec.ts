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
  it('a studio with many lines counts once (its own median)', () => {
    const many = studio(1, ['МК на колі — 800 грн/особа (сайт, 2026)', 'МК ліплення — 1 000 грн/особа (сайт, 2026)', 'МК розпис — 1 200 грн/особа (сайт, 2026)'])
    const one = studio(2, ['Груповий МК — 2 000 грн/особа (сайт, 2026)'])
    const { values } = studioValues([many, one])
    expect(values.get('group')?.map((x) => x.value).sort()).toEqual([1000, 2000])
    expect(scopeSpan([many, one])?.text).toBe(`${(1000).toLocaleString('uk-UA')} і ${(2000).toLocaleString('uk-UA')} грн`)
  })
})
