import { permanentRedirect } from 'next/navigation'

import { appBackend } from './backend'

// A renamed studio or city keeps its old URLs: before a page gives up with 404, check the slug history and 301 to
// the current slug. Only the new data layer keeps that history (DATA_BACKEND=app); under Payload this is a no-op.

export async function redirectOldStudioSlug(slug: string, path = (s: string) => `/vyrobnyky/${s}`): Promise<void> {
  if (!appBackend()) return
  const current = await (await import('@/server/publicCatalog')).currentStudioSlug(slug)
  if (current) permanentRedirect(path(current))
}

export async function redirectOldCitySlug(slug: string, path: (city: string) => string): Promise<void> {
  if (!appBackend()) return
  const current = await (await import('@/server/publicCatalog')).currentCitySlug(slug)
  if (current) permanentRedirect(path(current))
}
