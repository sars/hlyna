import type { MetadataRoute } from 'next'

import { site } from '@/content/site'

// Search engines and AI assistants are welcome everywhere except the panel, the cabinet and the APIs.
// The AI crawlers are named so the welcome is explicit, not inferred from `*`.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Bingbot', 'Applebot-Extended', 'CCBot']
// The shop's cart, checkout and order pages are the buyer's own; everything else in /kramnytsia is for indexing.
const disallow = ['/api', '/kabinet', '/panel', '/kramnytsia/koshyk', '/kramnytsia/oformlennia', '/kramnytsia/zamovlennia']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow }, ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow }))],
    sitemap: `${site.url}/sitemap.xml`,
  }
}
