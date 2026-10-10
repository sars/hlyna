import { revalidatePath, revalidateTag } from 'next/cache'

// POST /revalidate?secret=… — refresh every catalogue page (used right after a deploy, and by hand).
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) return new Response('Forbidden', { status: 403 })
  revalidateTag('studios', 'max')
  revalidatePath('/', 'layout')
  return Response.json({ revalidated: true, at: new Date().toISOString() })
}
