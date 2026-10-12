import { describe, expect, it } from 'vitest'

import { cleanAddress, cleanPublic, dedupeTexts, firstAddress, inCity, isDomainLike, noteIsFresh, stripPersonal } from '@/lib/present'

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
  it('strips «(нар. 1985 р.)» and «народилася … року» cleanly', () => {
    expect(stripPersonal('Ірина Петренко (нар. 1985 р.) працює з порцеляною.')).toBe('Ірина Петренко працює з порцеляною.')
    expect(stripPersonal('Ірина Петренко, народилася 1985 року у Львові, працює з порцеляною.')).toBe('Ірина Петренко, працює з порцеляною.')
    expect(stripPersonal('Народилася 1985 року в Ужгороді. Закінчила коледж мистецтв.')).toBe('Закінчила коледж мистецтв.')
    expect(stripPersonal('Студія відкрилася 2019 року. Народився у 1970 р. в Косові. Працює з ангобами.')).toBe('Студія відкрилася 2019 року. Працює з ангобами.')
    expect(stripPersonal('Народився в 1954 році, закінчив Львівський інститут. Створює тарелі.')).toBe('Закінчив Львівський інститут. Створює тарелі.')
    expect(stripPersonal('Табір 8–14 р., 10:00–14:00 — 600 грн/день')).toBe('Табір 8–14 р., 10:00–14:00 — 600 грн/день')
    // Not personal: studio and product years stay.
    expect(stripPersonal('Студія працює з 2019 року, чашки 2026 року по 650 грн.')).toBe('Студія працює з 2019 року, чашки 2026 року по 650 грн.')
  })
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


describe('isDomainLike', () => {
  it('flags domains and URLs, keeps names', () => {
    expect(isDomainLike('dobraglina.com.ua')).toBe(true)
    expect(isDomainLike('glinka.zp.ua__pologi')).toBe(true)
    expect(isDomainLike('bigme.ua')).toBe(true)
    expect(isDomainLike('Добра Глина')).toBe(false)
    expect(isDomainLike('helgapottery_ua')).toBe(false)
  })
})

describe('noteIsFresh', () => {
  const now = Date.UTC(2026, 9, 12)
  it('uses the latest month-year in the note', () => {
    expect(noteIsFresh('У жовтні 2026 року студія…', null, now)).toBe(true)
    expect(noteIsFresh('У серпні 2025 року анонсувала…', null, now)).toBe(false)
    expect(noteIsFresh('У серпні 2025 року… У жовтні 2026 року…', null, now)).toBe(true)
    expect(noteIsFresh('Улітку 2025 року бренд…', null, now)).toBe(false)
  })
  it('falls back to the last post date', () => {
    expect(noteIsFresh('Без дати', '2026-09-01', now)).toBe(true)
    expect(noteIsFresh('Без дати', '2025-12-01', now)).toBe(false)
    expect(noteIsFresh('Без дати', null, now)).toBe(true)
  })
})
