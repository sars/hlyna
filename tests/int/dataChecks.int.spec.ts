import { describe, expect, it } from 'vitest'

import { checkStudios, type CheckRow } from '../../src/server/services/dataChecks'

const row = (o: Partial<CheckRow>): CheckRow => ({
  slug: 'x', name: 'Ім’я', type: 'maker', city: 'Ужгород', visibility: 'public', summary: null, publicDescription: null, descriptionInternal: null, recentNote: null, instagram: null, facebook: null, website: null, ...o,
})
const rules = (o: Partial<CheckRow>) => checkStudios([row(o)]).map((i) => i.rule)

describe('data checks: errors found on 17.10.2026 stay found', () => {
  it('a birthplace left after the birth year was removed is not the city of work', () => {
    // «нар. 1962 у Вінниці» → «у Вінниці» (privacy cleanup 11.10.2026): the profile is in Uzhhorod
    expect(rules({ descriptionInternal: 'Кераміст у Вінниці, закінчив Одеське художнє училище.' })).toEqual(['birthplace-as-city'])
    expect(rules({ descriptionInternal: 'Живописиця, художниця-керамістка й педагогиня у Макіївці. Закінчила Ужгородське училище.' })).toEqual(['birthplace-as-city'])
    expect(rules({ city: 'Київ', descriptionInternal: 'Художниця-керамістка у с. Нересниця на Тячівщині, закінчила училище.' })).toEqual(['birthplace-as-city'])
    expect(rules({ summary: 'Кераміст у Монастирищі: панно.' })).toEqual(['birthplace-as-city'])
  })
  it('the same sentence about the profile’s own city, or a birthplace marked as one, passes', () => {
    expect(rules({ descriptionInternal: 'Художниця, керамістка й скульпторка в Ужгороді, закінчила коледж.' })).toEqual([])
    expect(rules({ city: 'Київ', descriptionInternal: 'Художниця декоративної кераміки у Києві; член НСХУ.' })).toEqual([])
    expect(rules({ city: 'Львів', descriptionInternal: 'Художниця декоративної кераміки у Львові; член НСХУ.' })).toEqual([])
    expect(rules({ descriptionInternal: 'Кераміст; народився у Вінниці, закінчив Одеське художнє училище.' })).toEqual([])
    // a role word that starts a clause is not a place of work
    expect(rules({ descriptionInternal: 'Гончар, проводив МК у Музеї сучасного мистецтва.' })).toEqual([])
    expect(rules({ summary: 'Гончарна студія у Старому Місті Запоріжжя.', city: 'Запоріжжя' })).toEqual([])
  })

  it('«Спадщина» (legacy) for a person needs a death in the text; museums and traditions need none', () => {
    expect(rules({ type: 'legacy', name: 'Микола Поляков', summary: 'Майстер народної творчості.' })).toEqual(['legacy-needs-death'])
    expect(rules({ type: 'legacy', name: 'Галина Севрук', summary: 'Галина Севрук (1929–2022) — художниця.' })).toEqual([])
    expect(rules({ type: 'legacy', name: 'Лідія Стасюк', publicDescription: 'Майстриня пішла з життя у 63 роки.' })).toEqual([])
    expect(rules({ type: 'legacy', name: 'Ганна Друль', publicDescription: 'Ганна Друль (22.09.1960, Червоноград — 23.07.2026, Львів).' })).toEqual([])
    expect(rules({ type: 'legacy', name: 'Волинський краєзнавчий музей' })).toEqual([])
    expect(rules({ type: 'legacy', name: 'Косівська мальована кераміка' })).toEqual([])
    // «Традиційна майстерня» (heritage) is a living folk master too: no death needed
    expect(rules({ type: 'heritage', name: 'Микола Поляков' })).toEqual([])
  })

  it('Instagram is an account link; a handle in the name is the profile’s own; one account is one profile', () => {
    expect(rules({ instagram: 'https://www.instagram.com/gnizdo_ceramics/' })).toEqual([])
    expect(rules({ instagram: 'http://instagram.com/artos_kiev' })).toEqual([])
    expect(rules({ instagram: 'ймовірно @studio' })).toEqual(['instagram-format'])
    expect(rules({ instagram: 'https://www.instagram.com/p/C9nPSTGNdln/' })).toEqual(['instagram-format'])
    expect(rules({ name: 'Володимир Корнієнко (4rom_people)', instagram: 'https://www.instagram.com/4rom_people/' })).toEqual([])
    expect(rules({ name: 'Володимир Корнієнко (4rom_people)', instagram: null })).toEqual(['handle-in-name'])
    expect(rules({ name: 'Керамист (ceramist.com.ua)' })).toEqual([])
    expect(rules({ instagram: 'https://www.instagram.com/a_b/', recentNote: 'Цей Instagram належить британській громадській ініціативі.' })).toEqual(['instagram-not-own'])
    const two = checkStudios([row({ slug: 'a', instagram: 'https://www.instagram.com/same/' }), row({ slug: 'b', instagram: 'https://instagram.com/Same' }), row({ slug: 'c', visibility: 'hidden', instagram: 'https://instagram.com/same' })])
    expect(two.map((i) => [i.rule, i.slug])).toEqual([['duplicate-instagram', 'a'], ['duplicate-instagram', 'b']])
    expect(rules({ website: 'не вказано' })).toEqual(['link-format'])
    expect(rules({ website: 'https://oks-kamini.com.ua/', facebook: 'https://www.facebook.com/x' })).toEqual([])
  })
})
