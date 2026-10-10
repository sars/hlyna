import { notFound } from 'next/navigation'
import React from 'react'

import { TopicPage } from '@/components/site/TopicPage'
import { topics } from '@/content/topics'
import { MIN_LIST, pluralUk } from '@/lib/catalog'
import { certificateCities, topicData, topicMetadata } from '@/lib/topics'

export const revalidate = 86400

const topic = topics.certificates

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
  return topicMetadata(topic, p.data, { title: `Сертифікат на гончарство: ${p.name} — ${p.data.ctx.n} ${pluralUk(p.data.ctx.n, ['місце', 'місця', 'місць'])}, ціни 2026`, path: p.path, h1: p.h1, coa: city })
}

export default async function Page({ params }: Args) {
  const { city } = await params
  const p = await load(city)
  if (!p) notFound()
  return <TopicPage topic={{ ...topic, path: p.path }} data={p.data} h1={p.h1} crumb={p.name} extraParents={[{ label: 'Сертифікати', href: '/sertyfikaty' }]} />
}
