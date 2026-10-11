// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { cleanAddress, cleanPublic, dedupeTexts, firstAddress, inCity, stripPersonal } from '@/lib/present'

describe('present: public text cleaners', () => {
  it('removes research notes from public text', () => {
    expect(cleanPublic('Студія працює з 2019 року (уточнюється). Вироби з червоної глини.')).toBe('Студія працює з 2019 року. Вироби з червоної глини.')
    expect(cleanPublic('Студія в центрі (сторінка зараз 404).')).not.toMatch(/404/)
    // Source hints stay: they are useful to readers.
    expect(cleanPublic('Майстер-класи щодня (сайт, 2026).')).toBe('Майстер-класи щодня (сайт, 2026).')
  })
  it('strips birth years', () => {
    expect(stripPersonal('Ірина, 1985 р. н., керамістка')).toBe('Ірина, керамістка')
  })
  // Known gaps (2026-10-11), kept visible: «(нар. 1985 р.)» stays; «народилася 1985 року…» leaves a leading comma.
  it.todo('strips «(нар. 1985 р.)» and «народилася 1985 року» cleanly')
  it('collapses near-duplicate list items', () => {
    expect(dedupeTexts(['майстер-класи', 'МК', 'подарункові сертифікати', 'сертифікати'])).toEqual(['майстер-класи', 'подарункові сертифікати'])
  })
  it('addresses: first street address, no stale or doubled punctuation', () => {
    expect(firstAddress('вул. Саксаганського, 24, Київ; вул. Хрещатик, 1, Київ')).toMatch(/^вул\. Саксаганського, 24/u)
    expect(cleanAddress('пр-т Альошина, 6 ,')).toBe('пр-т Альошина, 6')
    expect(cleanAddress('історично: вул. Хрещатик, 34')).toBe('')
  })
  it('Ukrainian locative for cities', () => {
    expect(inCity('Київ')).toBe('у Києві')
    expect(inCity('')).toBe('')
  })
})
