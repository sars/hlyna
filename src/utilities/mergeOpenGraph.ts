import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Каталог українських керамічних студій і майстрів. Посуд і подарунки ручної роботи для бізнесу, майстер-класи та сертифікати.',
  images: [
    {
      url: `${getServerSideURL()}/og-home.png`,
      width: 1200,
      height: 630,
    },
  ],
  locale: 'uk_UA',
  siteName: 'Глина · hlyna.com.ua',
  title: 'Глина — українська кераміка ручної роботи',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
