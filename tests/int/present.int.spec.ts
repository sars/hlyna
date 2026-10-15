import { describe, expect, it } from 'vitest'

import { caption, cleanAddress, cleanPublic, clipText, dedupeTexts, firstAddress, inCity, isDomainLike, newsIsFresh, noteIsFresh, stripPersonal, webUrl } from '@/lib/present'

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


describe('card captions (audit cause 5)', () => {
  const s = (name: string, shortName?: string) => ({ name, shortName })
  it('drops the studio name and its lead-in', () => {
    expect(caption(s('Quiet Form'), 'Quiet Form — київський бренд посуду')).toBe('Київський бренд посуду')
    expect(caption(s('ZOLA'), 'ZOLA, Одеса: кераміка для дому й бізнесу')).toBe('Кераміка для дому й бізнесу')
    expect(caption(s('Школа кераміки'), 'Школа кераміки в Івано-Франківську: гуртки й МК')).toBe('Гуртки й МК')
    expect(caption(s('Dosebe'), 'Dosebe робить посуд для кав’ярень')).toBe('Робить посуд для кав’ярень')
    expect(caption(s('Студія «Глина»', 'Глина'), 'Глина — студія на Подолі')).toBe('Студія на Подолі')
    expect(caption(s('КатАртСис'), 'Київська арт-студія КатАртСис: майстер-класи з ліплення')).toBe('Майстер-класи з ліплення')
    expect(caption(s('Glynar'), 'Гончарна студія Glynar на Лютеранській у Києві: щоденні майстер-класи')).toBe('Щоденні майстер-класи')
    expect(caption(s('Бузкова'), 'персоналізовані тарілки')).toBe('Персоналізовані тарілки')
    // The name inside the line, or a line about someone else, stays.
    expect(caption(s('Хатка'), 'Посуд для «Хатки» на замовлення')).toBe('Посуд для «Хатки» на замовлення')
  })
  it('cuts at a clause, a comma or between words, never inside a word or a number', () => {
    const long = 'Чашки 100/220/300/400 мл — 450/550/650/850 грн у будь-якій колекції; тарілки 12/15/17/20 см — 250/400/500/800 грн'
    expect(clipText(long)).toBe('Чашки 100/220/300/400 мл — 450/550/650/850 грн у будь-якій колекції')
    const nums = 'Гончарний або комбінований курс з матеріалами й випалом за чотири тижні для групи — 4 особи — 5 600 грн за весь курс'
    const out = clipText(nums)
    expect(out.length).toBeLessThanOrEqual(81)
    expect(out).toMatch(/…$/u)
    expect(out).not.toMatch(/\d …|\d…$|\s\p{L}…$/u)
    expect(clipText('Короткий рядок')).toBe('Короткий рядок')
    expect(clipText('Чашка коштує близько 1 200 грн, фігурка близько 500 грн, свічники 650–2 100 грн (tykyiv.com, лютий 2025); посуд роблять')).not.toMatch(/\(/u)
    // «вул.» is not the end of a sentence.
    expect(clipText('Заняття на колі й ліплення в майстерні на вул. Шевченка, 5 щосуботи і щонеділі для дорослих і дітей від шести років')).not.toMatch(/вул$/u)
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

describe('webUrl', () => {
  it('keeps absolute http(s) URLs, drops notes, names and bare handles', () => {
    expect(webUrl('https://www.instagram.com/saga.pottery/')).toBe('https://www.instagram.com/saga.pottery/')
    expect(webUrl(' http://example.com.ua ')).toBe('http://example.com.ua')
    expect(webUrl('@mykolasvitaylo (ймовірно)')).toBeNull()
    expect(webUrl('Восьма Комора')).toBeNull()
    expect(webUrl('chichka.in.ua')).toBeNull()
    expect(webUrl('http://гончар.укр (xn--80af4adm4b.xn--j1amh)')).toBeNull()
    expect(webUrl('https://localhost')).toBeNull()
    expect(webUrl('')).toBeNull()
    expect(webUrl(null)).toBeNull()
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
  it('studio news goes after about six months from the owner\'s save', () => {
    expect(newsIsFresh('2026-05-01T00:00:00Z', now)).toBe(true)
    expect(newsIsFresh('2026-04-01T00:00:00Z', now)).toBe(false)
  })
})
