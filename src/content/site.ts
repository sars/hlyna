// Facts about the site used in metadata, JSON-LD, llms.txt and copy. Keep numbers honest and dated.
export const site = {
  name: 'Глина',
  legalName: 'Глина',
  domain: 'hlyna.com.ua',
  url: process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua',
  description:
    'Каталог українських керамічних студій і майстрів. Посуд і подарунки ручної роботи для бізнесу, майстер-класи та сертифікати.',
  dataUpdated: 'жовтень 2026',
  dataModified: '2026-10-10', // ISO date of the last content update (JSON-LD dateModified)
  locale: 'uk_UA',
  // Business model, said openly so buyers and LLMs understand why requesting through us costs nothing.
  model:
    'Для замовника безкоштовно. Ціни встановлюють студії. Якщо замовлення відбулося, студія платить нам 5% від його суми; за розміщення чи запити ми грошей не беремо.',
  // Snapshot of the public catalogue (10 Oct 2026); pages use live counts from the database where available.
  stats: { makers: 507, cities: 110, masterClassPlaces: 196, withPrices: 137 },
  // Lead times as studios state them (not derived from price lines). Prices are never hard-coded:
  // pages take them from the live price index through src/lib/facts.ts.
  lead: {
    batch: '3–8 тижнів', // a batch of tableware made to order: forming, drying, two firings
    logo: '4–10 тижнів', // a batch with a logo: the batch plus 1–2 weeks for a new stamp or decal
    logoDetail: '3–8 тижнів на партію плюс 1–2 тижні на новий штамп чи деколь',
    customItem: '3–6 тижнів', // one piece made to order, e.g. a cup with an inscription
    pickup: '2–4 тижні', // collecting a piece after a class: drying and two firings
  },
}
