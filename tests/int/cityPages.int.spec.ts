import { describe, expect, it } from 'vitest'

import data from '@/content/city-masters.json'
import { cityPages, onPages, type StudioCard } from '@/lib/catalog'
import { cityMasters, sourceDateLabel } from '@/lib/cityMasters'
import { hiddenProfileTarget } from '@/lib/makers'
import { pageName, pageWhere } from '@/lib/present'

let id = 0
const at = (slug: string, name: string, oblast: string | null, n = 1) =>
  Array.from({ length: n }, () => ({ id: ++id, name: `S${id}`, slug: `s${id}`, cityDoc: { id: slug.length, slug, name, oblast } }) as unknown as StudioCard)

describe('city pages: an oblast centre covers its oblast (owner, 15.10.2026)', () => {
  const list = [
    ...at('ternopil', 'Тернопіль', 'Тернопільська', 1),
    ...at('honcharivka', 'Гончарівка', 'Тернопільська', 1),
    ...at('poltava', 'Полтава', 'Полтавська', 2),
    ...at('opishne', 'Опішне', 'Полтавська', 4),
    ...at('myrhorod', 'Миргород', 'Полтавська', 1),
    ...at('kyiv', 'Київ', 'м. Київ (спецстатус)', 3),
    ...at('irpin', 'Ірпінь', 'Київська', 2),
    ...at('sloviansk', "Слов'янськ", 'Донецька', 2),
    ...at('kosiv', 'Косів', null, 1),
  ]
  const pages = cityPages(list)
  const page = (slug: string) => pages.find((p) => p.city.slug === slug)

  it('a centre with one or two places still gets a page, with the rest of the oblast', () => {
    expect(page('ternopil')?.studios).toHaveLength(2)
    expect(page('ternopil')?.towns.map((t) => t.city.slug)).toEqual(['honcharivka'])
    expect(pageName(page('ternopil')!)).toBe('Тернопіль і область')
    expect(pageWhere(page('ternopil')!)).toBe('у Тернополі й області')
  })
  it('a town with three or more places keeps its page and is on its centre’s page too', () => {
    expect(page('opishne')?.towns).toEqual([])
    expect(page('poltava')?.studios).toHaveLength(7)
    expect(page('poltava')?.towns.map((t) => t.city.slug)).toEqual(['opishne', 'myrhorod'])
  })
  it('Kyiv’s page covers Kyiv oblast', () => {
    expect(pageName(page('kyiv')!)).toBe('Київ і область')
    expect(page('kyiv')?.studios).toHaveLength(5)
  })
  it('small towns get no page of their own; an oblast without a centre entry and a city without an oblast are on no page', () => {
    expect(page('myrhorod')).toBeUndefined()
    expect(page('irpin')).toBeUndefined()
    const listed = onPages(pages)
    expect(listed.has('myrhorod')).toBe(true)
    expect(listed.has('sloviansk')).toBe(false)
    expect(listed.has('kosiv')).toBe(false)
  })
  it('a centre alone keeps its plain name', () => {
    const solo = cityPages(at('rivne', 'Рівне', 'Рівненська', 1))
    expect(pageName(solo[0])).toBe('Рівне')
    expect(pageWhere(solo[0])).toBe('у Рівному')
  })
})

describe('a hidden profile goes to the makers nearby', () => {
  const pages = new Set(['kyiv', 'ternopil', 'opishne'])
  it('its own city page, else its oblast centre, else the cities index', () => {
    expect(hiddenProfileTarget({ slug: 'opishne', oblast: 'Полтавська' }, pages)).toBe('/vyrobnyky/misto/opishne')
    expect(hiddenProfileTarget({ slug: 'honcharivka', oblast: 'Тернопільська' }, pages)).toBe('/vyrobnyky/misto/ternopil')
    expect(hiddenProfileTarget({ slug: 'bucha', oblast: 'Київська' }, pages)).toBe('/vyrobnyky/misto/kyiv')
    expect(hiddenProfileTarget({ slug: 'myrhorod', oblast: 'Полтавська' }, pages)).toBe('/vyrobnyky/misto')
    expect(hiddenProfileTarget(null, pages)).toBe('/vyrobnyky/misto')
  })
})

describe('«Майстри, які працювали в місті» (owner, 17.10.2026): curated lines, no profile links, no guessed dates', () => {
  it('every entry has a name, one line of fact, a source with a URL and when we read it; no birth dates', () => {
    const all = Object.values(data).flat()
    expect(all.length).toBeGreaterThan(0)
    for (const m of all) {
      expect(m.name).toBeTruthy()
      expect(m.line).toMatch(/\S{10,}/u)
      expect(m.source.url).toMatch(/^https:\/\//u)
      expect(m.source.title).toBeTruthy()
      expect(m.seen).toMatch(/^\d{4}-\d{2}$/u)
      if ('date' in m) expect(m.date).toMatch(/^\d{4}(-\d{2})?$/u)
      expect(m.line).not.toMatch(/народи|р\. н\./iu)
      expect(m.line).not.toMatch(/\/vyrobnyky\//u)
    }
  })
  it('a city without entries gets none; the source date is the source’s own, else «без дати; переглянуто …»', () => {
    expect(cityMasters('no-such-city')).toEqual([])
    expect(sourceDateLabel({ date: '2013-03', seen: '2026-10' })).toBe('березень 2013')
    expect(sourceDateLabel({ date: '2015', seen: '2026-10' })).toBe('2015')
    expect(sourceDateLabel({ seen: '2026-10' })).toBe('без дати; переглянуто у жовтні 2026')
  })
})
