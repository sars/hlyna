import { site } from '@/content/site'
import { caseBySlug, casePath } from '@/editorial/cases'

// Old case URLs (/keysy/<case-id>) → the case under its studio, 301. Absolute URL from site.url (see ../route.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const c = caseBySlug((await params).slug)
  return Response.redirect(`${site.url}${c ? casePath(c) : '/dlya-biznesu'}`, 301)
}
