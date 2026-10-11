import { notFound } from 'next/navigation'
import React from 'react'

import { TopicPage } from '@/components/site/TopicPage'
import { productTopics } from '@/content/topics'
import { getAllStudios, MIN_LIST } from '@/lib/catalog'
import { productContent } from '@/editorial/places'
import { topicData, topicMetadata } from '@/editorial/topics'

export const revalidate = 86400

const bySlug = (slug: string) => Object.values(productTopics).find((t) => t.path.endsWith(`/${slug}`))

export function generateStaticParams() {
  return Object.values(productTopics).map((t) => ({ product: t.path.split('/').pop() as string }))
}

type Args = { params: Promise<{ product: string }> }

export async function generateMetadata({ params }: Args) {
  const topic = bySlug((await params).product)
  return topic ? topicMetadata(topic, await topicData(topic)) : {}
}

export default async function Page({ params }: Args) {
  const topic = bySlug((await params).product)
  if (!topic) notFound()
  const data = await topicData(topic)
  // No thin pages: fewer than MIN_LIST makers → 404 until the catalogue grows.
  if (data.ctx.n < MIN_LIST && process.env.BUILD_WITHOUT_DB !== '1') notFound()
  const slug = topic.path.split('/').pop() as string
  const known = new Map((await getAllStudios()).map((s) => [s.slug as string, s]))
  return <TopicPage topic={topic} data={data} content={productContent(slug)} known={known} />
}
