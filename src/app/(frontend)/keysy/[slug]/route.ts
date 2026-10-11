import { caseBySlug, casePath } from '@/editorial/cases'

// Old case URLs (/keysy/<case-id>) → the case under its studio, 301.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const c = caseBySlug((await params).slug)
  return Response.redirect(new URL(c ? casePath(c) : '/dlya-biznesu', req.url), 301)
}
