import { describe, expect, it } from 'vitest'

import { certTerm, confirmedForCompanies, confirmedForLogo, confirmedForVenues, giftCertificate, pickupTime, runsCorporateWorkshops, type StudioCard } from '@/lib/catalog'
import { certTermAnswer, certTermLead, type TopicCtx } from '@/content/topics'

const studio = (o: Partial<StudioCard>) => ({ id: 1, name: 'S', slug: 's', type: 'studio', ...o }) as StudioCard
const line = (text: string) => ({ text })

describe('business claims come from facts, not format tags (audit 15.10.2026, cause 3)', () => {
  it('a horeca or logo tag alone confirms nothing', () => {
    const tagged = studio({ formats: ['horeca', 'logo', 'corporate-gifts', 'corporate-workshop'] })
    expect(confirmedForVenues(tagged)).toBe(false)
    expect(confirmedForLogo(tagged)).toBe(false)
    expect(confirmedForCompanies(tagged)).toBe(false)
    expect(runsCorporateWorkshops(tagged)).toBe(false)
  })
  it('the b2b fields confirm', () => {
    expect(confirmedForVenues(studio({ b2b: { worksWithHoreca: true } }))).toBe(true)
    expect(confirmedForLogo(studio({ b2b: { logoMethods: [line('деколь')] } }))).toBe(true)
    expect(confirmedForCompanies(studio({ b2b: { worksWithCorporate: true } }))).toBe(true)
  })
  it('the studio’s own offer and price lines confirm', () => {
    expect(confirmedForLogo(studio({ services: [line('Нанесення логотипа деколлю, від 30 шт.')] }))).toBe(true)
    expect(confirmedForCompanies(studio({ products: [line('Корпоративні подарунки з кераміки')] }))).toBe(true)
    expect(runsCorporateWorkshops(studio({ prices: [line('Корпоратив до 20 осіб — 900 грн з особи')] }))).toBe(true)
  })
  it('venues are claimed only for makers, not shops', () => {
    expect(confirmedForVenues(studio({ type: 'shop', b2b: { worksWithHoreca: true } }))).toBe(false)
  })
})

describe('gift certificates from the studio’s own texts', () => {
  it('finds a certificate and how long it is valid', () => {
    expect(giftCertificate(studio({ publicDescription: 'Сертифікати продає сервіс KAVA, сертифікат дійсний 12 місяців.' }))).toEqual({ valid: '12 місяців', electronic: false })
    expect(giftCertificate(studio({ services: [line('Подарунковий сертифікат, термін дії 3 міс.')] }))).toEqual({ valid: '3 місяці', electronic: false })
    expect(giftCertificate(studio({ services: [line('Подарункові сертифікати на будь-яку суму')] }))).toEqual({ valid: null, electronic: false })
    expect(giftCertificate(studio({ prices: [line('Подарунковий сертифікат — від 300 грн, паперовий або електронний, діє 6 міс.')] }))).toEqual({ valid: '6 місяців', electronic: true })
    expect(giftCertificate(studio({ services: [line('Подарунковий сертифікат — 1 000 грн, у PDF на пошту')] }))?.electronic).toBe(true)
    // Paying online is not an electronic certificate (pre-deploy review, 16.10.2026).
    expect(giftCertificate(studio({ services: [line('Сертифікат можна оплатити онлайн')] }))?.electronic).toBe(false)
    expect(giftCertificate(studio({ services: [line('Подарункові сертифікати на довільну суму, замовлення в директ')] }))?.electronic).toBe(false)
    const forever = giftCertificate(studio({ services: [line('подарункові сертифікати без терміну дії')] }))!
    expect(certTerm(forever)).toBe('без терміну дії')
  })
  it('a quality certificate is not a gift', () => {
    expect(giftCertificate(studio({ products: [line('Глина з сертифікатом якості, сертифікована полива')] }))).toBeNull()
    expect(giftCertificate(studio({}))).toBeNull()
  })
})

describe('pickup time from the studio’s own texts', () => {
  it('takes the last span after «через»/«за» in a pickup sentence', () => {
    expect(pickupTime(studio({ publicDescription: 'Після утильного випалу роботи готові через 2 тижні, після випалу з поливою — через 3–4 тижні.' }))).toMatchObject({ text: '3–4 тижні', weeks: [3, 4] })
    expect(pickupTime(studio({ publicDescription: 'Запис за передоплатою 50 %, вироби готові за п\'ять тижнів і зберігаються два місяці.' }))).toMatchObject({ text: 'п\'ять тижнів', weeks: [5, 5] })
    expect(pickupTime(studio({ publicDescription: 'Вироби не випалюють: їх забирають висушеними через 7 днів.' }))).toMatchObject({ unfired: true, weeks: [1, 1] })
  })
  it('coworking, subscriptions and orders are other terms', () => {
    expect(pickupTime(studio({ publicDescription: 'Курс з 8 занять за 2 місяці: отримаєте власні вироби й навички роботи на колі.' }))).toBeNull()
    expect(pickupTime(studio({ prices: [line('Коворкінг — 4 700 грн на два тижні, готові вироби забирають')] }))).toBeNull()
    expect(pickupTime(studio({ publicDescription: 'Маслянка на замовлення, виготовлення 3–5 тижнів.' }))).toBeNull()
  })
})

describe('certificate terms say only what the studios state', () => {
  const ctx = (certs: { name: string; valid: string | null; electronic: boolean }[]): TopicCtx => ({ n: 3, cities: 1, place: 'Луцьк', price: () => '', local: { certs, pickup: [], corporate: [], parties: [], cowork: [] } })
  it('no stated term: ask the studio, no claim about the certificate itself', () => {
    for (const t of [certTermLead(ctx([{ name: 'A', valid: null, electronic: false }])), certTermAnswer(ctx([]))]) {
      expect(t).toMatch(/уточніть/u)
      expect(t).not.toMatch(/на самому сертифікаті/u)
    }
  })
  it('a stated term is quoted with the studio', () => {
    expect(certTermAnswer(ctx([{ name: 'Хаос', valid: '2 місяці', electronic: true }]))).toMatch(/^Термін дії вказує 1 з 3 місць: Хаос — 2 місяці\. В інших студій термін уточніть при купівлі\.$/u)
  })
})
