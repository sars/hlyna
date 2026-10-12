import { NextResponse, type NextRequest } from 'next/server'

import { slugRedirects } from '@/server/slugRedirects'

// Renamed studios and cities: their old URLs answer 308 with Location here, before the page cache. A redirect from
// inside an ISR page is cached and later served as a bare 308 without Location (Next 16), which crawlers cannot follow.
// The pages keep their own redirect as a fallback for the minute before the map below is refreshed.

const CITY_PAGES = ['/vyrobnyky/misto/', '/maister-klasy/', '/sertyfikaty/']

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const parts = pathname.split('/')
  const { studios, cities } = await slugRedirects()
  let to: string | null = null

  const prefix = CITY_PAGES.find((p) => pathname.startsWith(p))
  if (prefix) {
    const rest = pathname.slice(prefix.length).split('/')
    const city = cities.get(decodeURIComponent(rest[0] ?? ''))
    if (city) to = prefix + [city, ...rest.slice(1)].join('/')
  } else if (parts[1] === 'vyrobnyky' && parts[2]) {
    const studio = studios.get(decodeURIComponent(parts[2]))
    if (studio) to = ['', 'vyrobnyky', studio, ...parts.slice(3)].join('/')
  }

  if (!to) return NextResponse.next()
  return NextResponse.redirect(new URL(to + search, req.url), 308)
}

export const config = {
  matcher: ['/vyrobnyky/:path+', '/maister-klasy/:path+', '/sertyfikaty/:path+'],
}
