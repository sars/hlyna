import { describe, expect, it } from 'vitest'

import { stableTitle } from '@/lib/ogImage'

describe('share card titles carry no years (SYSTEM.md §7.4)', () => {
  it('drops a year or a season wherever it stands', () => {
    expect(stableTitle('Керамічні ялинкові прикраси 2026/27: топ українських студій')).toBe('Керамічні ялинкові прикраси: топ українських студій')
    expect(stableTitle('Ціни на кераміку і майстер-класи 2026')).toBe('Ціни на кераміку і майстер-класи')
    expect(stableTitle('Сезон 2026–2027 у Львові')).toBe('Сезон у Львові')
  })
  it('takes the preposition and «році» along, keeps «року» without one', () => {
    expect(stableTitle('Подарунки у 2026 році')).toBe('Подарунки')
    expect(stableTitle('Символ 2027 року: кози, барани й вівці')).toBe('Символ року: кози, барани й вівці')
  })
  it('keeps prices and cuts a counted part after the colon', () => {
    expect(stableTitle('Набір за 2000 грн')).toBe('Набір за 2000 грн')
    expect(stableTitle('Гончарне коло у Києві: 20 місць, ціни')).toBe('Гончарне коло у Києві')
  })
})
