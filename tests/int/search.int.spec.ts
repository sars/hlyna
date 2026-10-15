import { describe, expect, it } from 'vitest'

import { prepare, search, type SearchDoc, type SearchIndex } from '@/lib/search/engine'
import { fold, otherLayout, words } from '@/lib/search/normalize'

describe('search: normalize', () => {
  it('folds Ukrainian, Russian and Latin spellings of one name together', () => {
    const same = (...xs: string[]) => expect(new Set(xs.map((x) => fold(words(x)[0])))).toHaveProperty('size', 1)
    same('Львів', 'Lviv', 'Львов')
    same('Київ', 'Kyiv', 'Kiev', 'Киев')
    same('Одеса', 'Odesa', 'Odessa', 'Одесса')
    same('Харків', 'Kharkiv', 'Харьков')
    same('Запоріжжя', 'Zaporizhzhia', 'Запорожье')
    same('Вінниця', 'Vinnytsia', 'Винница')
    same('glinland', 'Глінленд')
  })
  it('keeps a Cyrillic «сх» apart from «ш»', () => {
    expect(fold('схід')).not.toBe(fold('шід'))
  })
  it('splits hyphenated names and drops apostrophes', () => {
    expect(words('Івано-Франківськ')).toEqual(['івано', 'франківськ'])
    expect(words('Кав’ярні')).toEqual(['кавярні'])
  })
  it('reads a word typed in the other keyboard layout', () => {
    expect(otherLayout('kmdsd')).toBe('львів')
    expect(otherLayout('пдштдфтв')).toBe('glinland')
    expect(otherLayout('kmdsd коло')).toBeNull()
  })
})

const doc = (d: Partial<SearchDoc> & Pick<SearchDoc, 'k' | 't' | 'u'>): SearchDoc => d
const index: SearchIndex = {
  v: 1,
  at: '2026-10-15T00:00:00.000Z',
  cities: [
    ['lviv', 'Львів'],
    ['kyiv', 'Київ'],
    ['irpin', 'Ірпінь'],
    ['mykolaiv', 'Миколаїв'],
  ],
  docs: [
    doc({ k: 'page', t: 'Гончарне коло у Львові', u: '/maister-klasy/lviv/honcharne-kolo', s: '7 місць', c: ['lviv'], f: ['wheel'], n: 7 }),
    doc({ k: 'page', t: 'Ліплення з глини у Львові', u: '/maister-klasy/lviv/lipennya', s: '9 місць', c: ['lviv'], f: ['handbuilding'], n: 9 }),
    doc({ k: 'page', t: 'Гончарне коло у Києві', u: '/maister-klasy/kyiv/honcharne-kolo', s: '17 місць', c: ['kyiv'], f: ['wheel'], n: 17 }),
    doc({ k: 'page', t: 'Гончарство для двох у Києві', u: '/maister-klasy/kyiv/dlya-dvokh', s: '9 місць', c: ['kyiv'], f: ['couples'], n: 9 }),
    doc({ k: 'page', t: 'Майстер-класи на гончарному колі', u: '/maister-klasy/honcharne-kolo', w: 'Гончарне коло', f: ['wheel'] }),
    doc({ k: 'city', t: 'Львів і область', u: '/maister-klasy/lviv', s: 'Майстер-класи з кераміки: 13 місць', c: ['lviv'], n: 13 }),
    doc({ k: 'city', t: 'Київ і область', u: '/maister-klasy/kyiv', s: 'Майстер-класи з кераміки: 30 місць', c: ['kyiv', 'irpin'], n: 30 }),
    doc({ k: 'page', t: 'Чашки з логотипом від українських керамічних студій', u: '/dlya-biznesu/chashky-z-lohotypom', f: ['logo'] }),
    doc({ k: 'studio', t: 'glinland', u: '/vyrobnyky/glinland', s: 'Одеса · гончарне коло' }),
    doc({ k: 'studio', t: 'Кераміка Львів', u: '/vyrobnyky/keramika-lviv', s: 'Львів · гончарне коло', c: ['lviv'], f: ['wheel'] }),
    doc({ k: 'studio', t: 'Глиняна хата', u: '/vyrobnyky/hlyniana-khata', s: 'Львів · ліплення', c: ['lviv'], f: ['handbuilding'] }),
    doc({ k: 'studio', t: 'Глиняний дім', u: '/vyrobnyky/hlynianyi-dim', s: 'Львів · ліплення', c: ['lviv'], f: ['handbuilding'], x: 'активність не підтверджена' }),
    doc({ k: 'studio', t: 'Ірпінська майстерня', u: '/vyrobnyky/irpinska', s: 'Ірпінь · для двох', c: ['irpin'], f: ['couples'] }),
    doc({ k: 'studio', t: 'Миколаївська кераміка', u: '/vyrobnyky/mykolaivska', s: 'Миколаїв', c: ['mykolaiv'] }),
    doc({ k: 'guide', t: 'Як обрати майстер-клас з кераміки', u: '/hayidy/yak-obraty-maister-klas', s: 'Гайд' }),
  ],
}
const p = prepare(index)
const find = (q: string) => search(p, q)!

describe('search: answers', () => {
  it('city + format → the format page of that city', () => {
    expect(find('коло львів').answer?.u).toBe('/maister-klasy/lviv/honcharne-kolo')
    expect(find('гончарный круг львов').answer?.u).toBe('/maister-klasy/lviv/honcharne-kolo')
    expect(find('побачення київ').answer?.u).toBe('/maister-klasy/kyiv/dlya-dvokh')
  })
  it('a city alone → the city page, whatever the spelling or case', () => {
    for (const q of ['Львів', 'lviv', 'Львов', 'у Львові', 'майстер клас львів']) expect(find(q).answer?.u, q).toBe('/maister-klasy/lviv')
  })
  it('a town → its oblast centre page', () => {
    expect(find('ірпінь').answer?.u).toBe('/maister-klasy/kyiv')
  })
  it('a format alone → the whole-Ukraine page, not one city', () => {
    expect(find('гончарне коло').answer?.u).toBe('/maister-klasy/honcharne-kolo')
  })
  it('business words → the business page', () => {
    expect(find('чашки з логотипом').answer?.u).toBe('/dlya-biznesu/chashky-z-lohotypom')
  })
  it('a city alias that does not fold', () => {
    expect(find('николаев').studios[0]?.u).toBe('/vyrobnyky/mykolaivska')
  })
})

describe('search: studios and forgiveness', () => {
  it('finds a studio by a Latin name typed in Cyrillic and in the wrong layout', () => {
    expect(find('глінленд').studios[0]?.u).toBe('/vyrobnyky/glinland')
    const r = find('пдштдфтв')
    expect(r.corrected).toBe('glinland')
    expect(r.studios[0]?.u).toBe('/vyrobnyky/glinland')
  })
  it('fixes words typed in the wrong layout', () => {
    const r = find('kmdsd')
    expect(r.corrected).toBe('львів')
    expect(r.answer?.u).toBe('/maister-klasy/lviv')
    expect(find('kmdsd rjkj').answer?.u).toBe('/maister-klasy/lviv/honcharne-kolo')
    expect(find('lviv').corrected).toBeUndefined()
  })
  it('finds a name while it is being typed and with a typo', () => {
    expect(find('глиняна х').studios[0]?.u).toBe('/vyrobnyky/hlyniana-khata')
    expect(find('глинана хата').studios[0]?.u).toBe('/vyrobnyky/hlyniana-khata')
  })
  it('puts a studio with unconfirmed activity below an active one', () => {
    const urls = find('глинян').studios.map((h) => h.u)
    expect(urls.indexOf('/vyrobnyky/hlyniana-khata')).toBeLessThan(urls.indexOf('/vyrobnyky/hlynianyi-dim'))
  })
  it('highlights the typed part of the title', () => {
    const h = find('кераміка льв').studios.find((x) => x.u === '/vyrobnyky/keramika-lviv')!
    expect(h.marks.map(([a, b]) => h.t.slice(a, b))).toEqual(['Кераміка', 'Льв'])
  })
})

describe('search: edges', () => {
  it('a one-letter or stop-word query does not search', () => {
    expect(search(p, 'к')).toBeNull()
    expect(search(p, '  у  ')).toBeNull()
  })
  it('two letters list matches but give no answer', () => {
    const r = find('ки')
    expect(r.answer).toBeNull()
    expect(r.total).toBeGreaterThan(0)
  })
  it('nothing for gibberish', () => {
    expect(find('zzqx').total).toBe(0)
  })
})
