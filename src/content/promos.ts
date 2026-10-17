// Seasonal promo strips (PromoStrip, rendered by components/site/SeasonPromo.tsx at fixed places on the site).
// One entry per campaign. An entry shows on the places it lists through `until` (YYYY-MM-DD, Kyiv time), then nothing
// renders (pages refresh daily; POST /revalidate?all=1 drops it at once). Ending a campaign early or cleaning up after
// it = deleting its entry here (and its photo in sitePhotos); the places stay for the next campaign.
// Clicks: GA4 event `promo_click` with promo_id = `id`, promo_place = the place (Analytics.tsx).
import { sitePhotos, type SitePhoto } from '@/content/photos'

export type PromoPlace = 'home' | 'mk-index' | 'mk-city' | 'mk-topic' | 'gifts'

export type Promo = {
  id: string
  until: string
  href: string
  places: PromoPlace[]
  photo: SitePhoto
  kicker: string
  title: string
  cta: string
  /** The fact line; `city` (slug) is set only on a city's master-class page. */
  text: (place: PromoPlace, city?: string) => string
}

// Halloween 2026 (owner, 17.10.2026): numbers from the page's own lead (src/content/waveB/khellovin.json).
const KHELLOVIN_CITIES: Record<string, string> = { lviv: 'Львові', sumy: 'Сумах', 'ivano-frankivsk': 'Івано-Франківську', odesa: 'Одесі', cherkasy: 'Черкасах', kyiv: 'Києві' }

export const promos: Promo[] = [
  {
    id: 'khellovin-2026',
    until: '2026-10-31',
    href: '/dobirky/keramika-na-khellovin',
    places: ['home', 'mk-index', 'mk-city', 'mk-topic', 'gifts'],
    photo: sitePhotos.promoKhellovin,
    kicker: 'Добірка · до 31 жовтня',
    title: 'Кераміка на Хелловін',
    cta: 'Відкрити добірку',
    text: (place, city) => {
      if (place === 'home' || place === 'gifts')
        return 'Гарбузи 595–1 300 грн і чашки з привидами 650–2 300 грн від 13 українських майстерень; майстер-класи з глини до 31 жовтня у шести містах.'
      const loc = city ? KHELLOVIN_CITIES[city] : undefined
      return loc
        ? `Майстер-класи з глини до 31 жовтня у ${loc} і ще п’яти містах, 650–1 100 грн там, де ціну названо; гарбузи й чашки з привидами від 13 майстерень.`
        : 'Майстер-класи з глини до 31 жовтня у Львові, Сумах, Івано-Франківську, Одесі, Черкасах і Києві, 650–1 100 грн; гарбузи й чашки з привидами від 13 майстерень.'
    },
  },
]
