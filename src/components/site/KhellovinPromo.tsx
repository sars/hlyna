import React from 'react'

import { PromoStrip } from '@/components/ui/PromoStrip'
import { sitePhotos } from '@/content/photos'
import { kyivToday } from '@/lib/dates'

// Temporary pointer to /dobirky/keramika-na-khellovin (owner, 17.10.2026). Shown through 31 October 2026, Kyiv time, then
// it renders nothing on its own (pages are ISR with a daily refresh, so it may linger up to a day; POST /revalidate?all=1
// drops it at once). To turn it off earlier: set UNTIL to yesterday. Once the season is over, delete this file and its
// five call sites (home, /maister-klasy, /maister-klasy/[city], TopicPage for mk topics, /podarunky-z-keramiky), keep
// PromoStrip for the next season. Numbers come from the page's own lead (src/content/waveB/khellovin.json).
const UNTIL = '2026-10-31'
const HREF = '/dobirky/keramika-na-khellovin'
const ID = 'khellovin-2026'

// Cities with a clay class before Halloween on the page, in the locative for «у …».
const CLASS_CITIES: Record<string, string> = { lviv: 'Львові', sumy: 'Сумах', 'ivano-frankivsk': 'Івано-Франківську', odesa: 'Одесі', cherkasy: 'Черкасах', kyiv: 'Києві' }

export type PromoPlace = 'home' | 'mk-index' | 'mk-city' | 'mk-topic' | 'gifts'

// `city` (slug) only on a city's master-class page: a city with a class on the list gets its name in the line.
export function KhellovinPromo({ place, city }: { place: PromoPlace; city?: string }) {
  if (kyivToday() > UNTIL) return null
  const classesFirst = place === 'mk-index' || place === 'mk-city' || place === 'mk-topic'
  const loc = city ? CLASS_CITIES[city] : undefined
  const text = classesFirst
    ? loc
      ? `Майстер-класи з глини до 31 жовтня у ${loc} і ще п’яти містах, 650–1 100 грн там, де ціну названо; гарбузи й чашки з привидами від 13 майстерень.`
      : 'Майстер-класи з глини до 31 жовтня у Львові, Сумах, Івано-Франківську, Одесі, Черкасах і Києві, 650–1 100 грн; гарбузи й чашки з привидами від 13 майстерень.'
    : 'Гарбузи 595–1 300 грн і чашки з привидами 650–2 300 грн від 13 українських майстерень; майстер-класи з глини до 31 жовтня у шести містах.'
  return <PromoStrip href={HREF} photo={sitePhotos.promoKhellovin} kicker="Добірка · до 31 жовтня" title="Кераміка на Хелловін" text={text} cta="Відкрити добірку" promo={ID} place={place} />
}
