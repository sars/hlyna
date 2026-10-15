import { describe, expect, it } from 'vitest'

import linked from '@/content/linked.json'
import { alsoFor, countPlaces } from '@/lib/linked'

describe('linked profiles («Також»): shown both ways, counted once (owner, 16.10.2026)', () => {
  it('each side shows the other with what it is to it', () => {
    expect(alsoFor('ubodecor')).toEqual([{ slug: 'nayu-ceramic-tiles', label: 'Плиткова марка бренду UBO' }])
    expect(alsoFor('nayu-ceramic-tiles')).toEqual([{ slug: 'ubodecor', label: 'Бренд, який створив NAYU' }])
    expect(alsoFor('olena-tsvietkova').map((a) => a.slug)).toEqual(['studiia-keramiky-helena', 'studiia-keramiky-obiednani-vohnem'])
  })
  it('a group of linked profiles counts as one place', () => {
    const s = (slug: string) => ({ slug })
    expect(countPlaces([s('olena-tsvietkova'), s('studiia-keramiky-helena'), s('studiia-keramiky-obiednani-vohnem'), s('sofika')])).toBe(2)
    expect(countPlaces([s('ubodecor'), s('sofika')])).toBe(2)
  })
  it('every entry has two slugs, two labels and a source', () => {
    for (const l of linked) {
      expect(l.slugs).toHaveLength(2)
      expect(l.labels).toHaveLength(2)
      expect(l.why.length).toBeGreaterThan(10)
    }
  })
})

describe('academies teach ceramics but are not studios (owner, 16.10.2026)', () => {
  it('departments, academies and colleges are out of studio lists; a children’s palace and a school stay', async () => {
    const { isAcademic, isStudio } = await import('@/lib/catalog')
    expect(isStudio({ type: 'school', name: 'Кафедра художньої кераміки ЛНАМ' })).toBe(false)
    expect(isAcademic({ name: 'Волинський фаховий коледж культури і мистецтв' })).toBe(true)
    expect(isStudio({ type: 'school', name: 'Київський палац дітей та юнацтва — майстерня кераміки' })).toBe(true)
    expect(isStudio({ type: 'school', name: 'Школа гончарства' })).toBe(true)
  })
})
