import { getSearchIndex } from '@/server/searchIndex'

// The site search index (src/server/searchIndex.ts): fetched by the header search when it opens. A data change refreshes it at once (tag studios); the daily refresh only drops dates that have passed.
export const revalidate = 86400

export async function GET() {
  return Response.json(await getSearchIndex(), { headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600', 'X-Robots-Tag': 'noindex' } })
}
