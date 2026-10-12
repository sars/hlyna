import { revalidatePath, revalidateTag } from 'next/cache'

// POST /revalidate?secret=… — refresh every catalogue page after a deploy or a data script. Stale-while-revalidate:
// a reader gets the current HTML at once and the page re-renders in the background with fresh data.
// ?all=1 also drops every page's HTML, so the next visit to each page waits for a fresh render (by hand only).
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const params = new URL(req.url).searchParams
  if (!process.env.REVALIDATE_SECRET || params.get('secret') !== process.env.REVALIDATE_SECRET) return new Response('Forbidden', { status: 403 })
  revalidateTag('studios', 'max')
  if (params.get('all') === '1') revalidatePath('/', 'layout')
  return Response.json({ revalidated: true, all: params.get('all') === '1', at: new Date().toISOString() })
}
