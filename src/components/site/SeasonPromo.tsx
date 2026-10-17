import React from 'react'

import { PromoStrip } from '@/components/ui/PromoStrip'
import { promos, type PromoPlace } from '@/content/promos'
import { kyivToday } from '@/lib/dates'

// The place for a seasonal promo strip (home, /maister-klasy, city and format class pages, gifts). Shows the first
// campaign in src/content/promos.ts that lists this place and hasn't ended; with none, renders nothing.
export function SeasonPromo({ place, city }: { place: PromoPlace; city?: string }) {
  const today = kyivToday()
  const p = promos.find((x) => x.places.includes(place) && today <= x.until)
  if (!p) return null
  return <PromoStrip href={p.href} photo={p.photo} kicker={p.kicker} title={p.title} text={p.text(place, city)} cta={p.cta} promo={p.id} place={place} />
}
