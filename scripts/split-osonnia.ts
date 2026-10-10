// One-off (2026-10-10): «Осоння» is two studios (Sumy and Ivano-Frankivsk) that research merged into one record.
// Rewrites the Ivano-Frankivsk record with its own data and creates the Sumy one. Idempotent.
//   pnpm payload run scripts/split-osonnia.ts
import { getPayload } from 'payload'
import config from '@payload-config'

import { sourceIdFor } from './source-id'

const payload = await getPayload({ config })
const city = async (slug: string) => (await payload.find({ collection: 'cities', where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]?.id
const t = (xs: string[]) => xs.map((text) => ({ text }))

const ifCity = await city('ivano-frankivsk')
const sumyCity = await city('sumy')
if (!ifCity || !sumyCity) throw new Error('city missing')

const IF = {
  name: 'Студія кераміки «Осоння» (Івано-Франківськ)',
  type: 'studio' as const,
  city: ifCity,
  instagram: 'https://www.instagram.com/osonnya.ceramics.if/',
  website: 'https://booking.osonnya.shop/if',
  email: 'osonnya.ceramics@gmail.com',
  summary: 'Франківська студія кераміки «Осоння»: майстер-класи з ліплення, заняття для дітей, виїзні МК і коворкінг для керамістів.',
  publicDescription:
    'Франківська студія «Осоння» — друга локація сумської студії з тією ж назвою. Тут проводять майстер-класи з ліплення з глини, групові заняття для дітей і виїзні майстер-класи, а керамісти можуть працювати в коворкінгу.\n\nВироби випалюють і глазурують у студії; власну кераміку «Осоння» продає через магазин osonnya.shop. Розклад, ціни й запис — у хайлайтах Instagram і на сторінці бронювання.',
  services: t(['майстер-класи з ліплення з глини', 'групові заняття для дітей', 'виїзні майстер-класи', 'МК для двох', 'майстер-класи для компаній', 'коворкінг для керамістів', 'подарункові сертифікати']),
  products: t(['посуд і декор ручної роботи (магазин osonnya.shop)']),
  prices: t([
    'Груповий МК 2,5 год (виріб до 25 см, декор ангобами, 2 випали з глазуруванням; групи до 10 осіб) — 700 грн/особа (Instagram, 2026)',
    'Парний МК — 2100 грн (Instagram, 2026)',
    'МК для своєї компанії, 3 год: 3 учасники — 2600 грн; 5 — 4000; 10 — 7700 грн (Instagram, 2026)',
  ]),
  formats: ['handbuilding', 'kids', 'couples', 'corporate-workshop', 'certificates'] as const,
}

const SUMY = {
  name: 'Студія кераміки «Осоння» (Суми)',
  type: 'studio' as const,
  city: sumyCity,
  address: 'просп. Свободи, 14, Суми',
  instagram: 'https://www.instagram.com/osonnya.ceramics/',
  website: 'https://www.osonnya.shop/',
  email: 'osonnya.ceramics@gmail.com',
  summary: 'Сумська студія кераміки «Осоння»: групові майстер-класи з ліплення, заняття для двох і для компаній, сертифікати, власний посуд.',
  publicDescription:
    '«Осоння» — студія кераміки в Сумах, що працює з жовтня 2024 року. Тут ліплять з глини й знайомляться з гончарним колом у невеликих групах, проводять заняття для двох і для компаній до 7 осіб; випал і глазурування входять у ціну.\n\nСтудія продає подарункові сертифікати, зокрема через KAVA, і власний посуд — чашки, стакани, свічки в керамічних ємностях — через магазин osonnya.shop. У 2025 році відкрила другу локацію в Івано-Франківську.',
  services: t(['групові майстер-класи з ліплення', 'знайомство з гончарним колом', 'МК для двох', 'майстер-класи для компаній до 7 осіб', 'подарункові сертифікати', 'подарункові бокси', 'інтернет-магазин власної кераміки']),
  products: t(['чашки', 'стакани', 'свічки в керамічних ємностях', 'посуд і декор ручної роботи']),
  prices: t([
    'Груповий МК, до 7 осіб, 2,5 год, виріб до 25 см — 650 грн/особа (сайт, 2026)',
    'МК для двох, 2,5 год — 1900 грн у будні / 2200 грн у вихідні (сайт, 2026)',
    'Корпоратив 3–7 осіб, 3 год — 2400–4600 грн (сайт, 2026)',
    'KAVA-сертифікат «Заняття з кераміки в групі», 3 год: 1 особа — 650 грн; пара — 2200 грн (kava.ua, 2026)',
    'Чашка «Злива»/«Мак» — 950 грн; стакан — 800 грн; свічка — 950–1000 грн (osonnya.shop, 2026)',
  ]),
  formats: ['handbuilding', 'wheel', 'couples', 'corporate-workshop', 'certificates'] as const,
}

const ifDoc = (await payload.find({ collection: 'studios', where: { slug: { equals: 'studiia-keramiky-osonnia-ivano-frankivsk' } }, limit: 1, depth: 0, draft: true })).docs[0]
if (ifDoc) {
  await payload.update({ collection: 'studios', id: ifDoc.id, data: { ...IF, formats: [...IF.formats] }, context: { disableRevalidate: true } })
  console.log('updated IF')
}
const sumySourceId = sourceIdFor('Осоння (Osonnya) — студія кераміки, Суми', 'Суми')
const existing = (await payload.find({ collection: 'studios', where: { slug: { equals: 'studiia-keramiky-osonnia-sumy' } }, limit: 1, depth: 0, draft: true })).docs[0]
const data = { ...SUMY, formats: [...SUMY.formats], slug: 'studiia-keramiky-osonnia-sumy', sourceId: sumySourceId, _status: 'published' as const }
if (existing) await payload.update({ collection: 'studios', id: existing.id, data, context: { disableRevalidate: true } })
else await payload.create({ collection: 'studios', data, context: { disableRevalidate: true } })
console.log(existing ? 'updated Sumy' : 'created Sumy')
process.exit(0)
