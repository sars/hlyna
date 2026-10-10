import { revalidateTag } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

// Refresh catalogue pages (profiles, cities, hubs, sitemap) after an edit in the admin.
// Outside the Next runtime (import scripts) revalidateTag throws; that is fine — pages revalidate hourly anyway.
const refresh = () => {
  try {
    revalidateTag('studios', 'max')
  } catch {
    /* not running inside Next */
  }
}

export const revalidateCatalogAfterChange: CollectionAfterChangeHook = ({ doc, context }) => {
  if (!context?.disableRevalidate) refresh()
  return doc
}

export const revalidateCatalogAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  refresh()
  return doc
}
