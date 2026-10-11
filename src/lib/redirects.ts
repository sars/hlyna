import { permanentRedirect } from 'next/navigation'

import { currentCitySlug, currentStudioSlug } from '@/server/publicCatalog'

// A renamed studio or city keeps its old URLs: before a page gives up with 404, check the slug history and 301 to
// the current slug.

export async function redirectOldStudioSlug(slug: string, path = (s: string) => `/vyrobnyky/${s}`): Promise<void> {
  const current = await currentStudioSlug(slug)
  if (current) permanentRedirect(path(current))
}

export async function redirectOldCitySlug(slug: string, path: (city: string) => string): Promise<void> {
  const current = await currentCitySlug(slug)
  if (current) permanentRedirect(path(current))
}
