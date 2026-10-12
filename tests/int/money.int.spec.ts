import { describe, expect, it } from 'vitest'

import { amountsIn, fromTo, median, near, priceIn, quantile, range, roundNice, spanOf, typicalRange, wholeAmountsIn } from '@/lib/money'

// The Ukrainian thousands separator is a no-break space.
const n = (x: number) => x.toLocaleString('uk-UA')

describe('money: reading amounts', () => {
  it('reads hryvnia amounts with spaces, decimals and ₴, within 150–20 000', () => {
    expect(amountsIn('МК 1 200 грн, для двох 2200 грн, випал 100 грн')).toEqual([1200, 2200])
    expect(amountsIn('чашка 450,50 грн або 900₴')).toEqual([450, 900])
    expect(amountsIn('без цін')).toEqual([])
  })
  it('whole amounts keep 100+ (the catalogue reading)', () => {
    expect(wholeAmountsIn('випал 100 грн, МК 900 грн')).toEqual([100, 900])
  })
  it('takes the lower end of a range or alternatives', () => {
    expect(priceIn('1 450–1 700 грн')).toBe(1450)
    expect(priceIn('1100/1300 грн')).toBe(1100)
    expect(priceIn('немає ціни')).toBeNull()
  })
  it('near() picks the price next to the given words', () => {
    const pick = near(/тарілк/iu)
    expect(pick('чашки 250–2200 грн, тарілки 545–4000 грн')).toBe(545)
    expect(pick('вази 900 грн')).toBe(900) // falls back to the first price
  })
})

describe('money: numbers', () => {
  it('rounds to believable steps', () => {
    expect(roundNice(870)).toBe(850)
    expect(roundNice(3120)).toBe(3100)
    expect(roundNice(1049)).toBe(1000)
  })
  it('median, quantile and range', () => {
    expect(median([1, 3, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1)).toBe(2)
    expect(range([5, 1, 3])).toEqual({ min: 1, max: 5, median: 3 })
    expect(range([])).toBeNull()
  })
  it('typical range trims extremes from 5 prices on', () => {
    expect(typicalRange([300, 900])).toEqual({ min: 300, max: 900 })
    expect(typicalRange([100, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 20000])).toEqual({ min: 800, max: 20000 })
  })
})

describe('money: one wording for prices (spanOf, fromTo)', () => {
  it('1 price → «X грн»; 2 → «X і Y грн»; 3–4 → «від X до Y грн»', () => {
    expect(spanOf([900])?.text).toBe('900 грн')
    expect(spanOf([900, 1300])?.text).toBe(`900 і ${n(1300)} грн`)
    expect(spanOf([900, 1200, 1700])?.text).toBe(`від 900 до ${n(1700)} грн`)
  })
  it('never says «від X до X»', () => {
    for (const vals of [[900, 900], [900, 900, 900], [1000, 1000, 1000, 1000, 1000, 1000]]) {
      expect(spanOf(vals)?.text).not.toMatch(/від (\S+) до \1 /)
    }
    expect(fromTo(900, 900)).toBe('900 грн')
    expect(fromTo(900, 1500)).toBe(`від 900 до ${n(1500)} грн`)
  })
  it('ignores zeros and empty input', () => {
    expect(spanOf([])).toBeNull()
    expect(spanOf([0, 0])).toBeNull()
  })
})
