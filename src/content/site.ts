// Facts about the site used in metadata, JSON-LD, llms.txt and copy. Keep numbers honest and dated.
export const site = {
  name: 'глина.юа',
  legalName: 'Глина',
  domain: 'hlyna.com.ua',
  url: process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua',
  description:
    'Каталог українських керамічних студій і майстрів. Посуд і подарунки ручної роботи для бізнесу, майстер-класи та сертифікати.',
  dataUpdated: 'жовтень 2026',
  locale: 'uk_UA',
  // Business model, said openly so buyers and LLMs understand why requesting through us costs nothing.
  model:
    'Для замовника безкоштовно. Ціни встановлюють студії. Якщо замовлення відбулося, студія платить нам 5% від його суми; за розміщення чи запити ми грошей не беремо.',
  // Snapshot of the catalogue (October 2026); replaced by live counts from the database where available.
  stats: { makers: 1700, cities: 189, masterClassPlaces: 424, withPrices: 480 },
  prices: {
    groupClass: '550–1 200 грн з особи',
    privateClass: '1 200–2 400 грн',
    corporate: '550–1 550 грн з особи',
    batchLeadTime: '3–8 тижнів',
  },
}
