// Topic pages (business offers, master-class formats, certificates, products): one config per page,
// rendered by src/components/site/TopicPage.tsx. Configs are split by section; this keeps their original order.
import { businessTopics } from './business'
import { masterClassTopics } from './master-classes'
import { productTopics } from './products'
import type { Topic } from './shared'

export * from './shared'
export { productTopics }

export const topics: Record<string, Topic> = { logo: businessTopics['logo'], corporate: businessTopics['corporate'], newYear: businessTopics['newYear'], couples: masterClassTopics['couples'], kids: masterClassTopics['kids'], wheel: masterClassTopics['wheel'], handbuilding: masterClassTopics['handbuilding'], painting: masterClassTopics['painting'], courses: masterClassTopics['courses'], certificates: masterClassTopics['certificates'], restaurants: businessTopics['restaurants'], cafes: businessTopics['cafes'], hotels: businessTopics['hotels'], gifts: businessTopics['gifts'] }

export const topicList = [...Object.values(topics), ...Object.values(productTopics)]
