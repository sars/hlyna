import { describe, expect, it } from 'vitest'

import { cityPages, onPages, type StudioCard } from '@/lib/catalog'
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
