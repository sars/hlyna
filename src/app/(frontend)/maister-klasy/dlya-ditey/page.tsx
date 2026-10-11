import React from 'react'

import { TopicPage } from '@/components/site/TopicPage'
import { topics } from '@/content/topics'
import { topicData, topicMetadata } from '@/editorial/topics'

export const revalidate = 86400

const topic = topics.kids

export async function generateMetadata() {
  return topicMetadata(topic, await topicData(topic))
}

export default async function Page() {
  return <TopicPage topic={topic} data={await topicData(topic)} />
}
