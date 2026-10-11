import { site } from '@/content/site'

// Cases moved under their studios (/vyrobnyky/<studio>/keisy/<case>); there is no site-wide index any more.
// Absolute URL from site.url: behind Caddy, req.url carries the container's internal host.
export function GET() {
  return Response.redirect(`${site.url}/dlya-biznesu`, 301)
}
