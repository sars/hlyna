import { notFound } from 'next/navigation'
import React from 'react'

import { TopicPage } from '@/components/site/TopicPage'
import { certOnline, certTerms, corporateNames, mostly, priceRange, topics, type Topic } from '@/content/topics'
import { MIN_LIST, pluralUk } from '@/lib/catalog'
import { inCity } from '@/lib/present'
import { certificateCities, topicData, topicMetadata } from '@/editorial/topics'
import { redirectOldCitySlug } from '@/lib/redirects'

export const revalidate = 86400

const topic = topics.certificates

// A city's certificate page says what its own studios say (audit 15.10.2026, cause 6): who states a term and which one,
// who sends an electronic certificate, who runs corporate classes. Without such a fact the sentence or question goes,
// and the whole-Ukraine «Як обрати сертифікат» block stays on /sertyfikaty only.
const cityTopic = (path: string): Topic => ({
  ...topic,
  path,
  sections: [],
  lead: (c) => {
    const terms = certTerms(c)
    const online = certOnline(c)
    return [
      `У каталозі — ${c.n} ${pluralUk(c.n, ['місце', 'місця', 'місць'])} ${inCity(c.place ?? '')}, які продають подарункові сертифікати на майстер-класи з кераміки.`,
      priceRange(c) ? `Сертифікат коштує ${mostly(c)}.` : '',
      terms ? `${terms}.` : 'Термін дії в профілях не вказано — його пишуть на самому сертифікаті.',
      online ? `Електронний сертифікат ${online}.` : '',
    ].filter(Boolean).join(' ')
  },
  faq: (c) => {
    const terms = certTerms(c)
    const online = certOnline(c)
    const corporate = corporateNames(c)
    return [
      { q: `Скільки коштує сертифікат на гончарство ${inCity(c.place ?? '')}?`, a: priceRange(c) ? `Сертифікат коштує ${mostly(c)}; ціна залежить від формату й тривалості заняття.` : 'У прайсах студій цієї сторінки ціни сертифіката немає — суму називає студія.' },
      { q: 'Скільки діє сертифікат?', a: terms ? `${terms}. В інших його пишуть на самому сертифікаті.` : 'У профілях студій цієї сторінки термін не вказано — його пишуть на самому сертифікаті.' },
      ...(online ? [{ q: 'Чи можна купити сертифікат в останній день?', a: `Електронний сертифікат ${online}: його надсилають на пошту чи в месенджер, тож встигнути можна й у день свята.` }] : []),
      { q: 'А для команди?', a: corporate ? `Корпоративи з ліплення з глини ${corporate}. Надішліть запит — передамо студіям, які роблять подібне.` : `Для колективу зручніше корпоратив з ліплення з глини: по Україні ${c.price('corporate')}. Надішліть запит — передамо студіям, які роблять подібне.` },
    ]
  },
})

export async function generateStaticParams() {
  try {
    return (await certificateCities()).map((c) => ({ city: c.slug as string }))
  } catch {
    return []
  }
}

type Args = { params: Promise<{ city: string }> }

async function load(slug: string) {
  const data = await topicData(topic, slug)
  if (data.ctx.n < MIN_LIST) return null
  const name = data.ctx.place ?? ''
  return { data, name, h1: `Подарункові сертифікати на гончарство: ${name}`, path: `/sertyfikaty/${slug}` }
}

export async function generateMetadata({ params }: Args) {
  const { city } = await params
  const p = await load(city)
  if (!p) return {}
  return topicMetadata(topic, p.data, { title: `Сертифікат на гончарство: ${p.name} — ${p.data.ctx.n} ${pluralUk(p.data.ctx.n, ['місце', 'місця', 'місць'])}, ціни 2026`, path: p.path, h1: p.h1 })
}

export default async function Page({ params }: Args) {
  const { city } = await params
  const p = await load(city)
  if (!p) {
    await redirectOldCitySlug(city, (c) => `/sertyfikaty/${c}`)
    notFound()
  }
  return <TopicPage topic={cityTopic(p.path)} data={p.data} h1={p.h1} crumb={p.name} extraParents={[{ label: 'Сертифікати', href: '/sertyfikaty' }]} />
}
