// Refresh the public pages after a write. The site caches catalogue reads under the `studios` tag (src/lib/catalog.ts)
// and pre-renders profile and city pages; after the cutover the same tag covers the new data layer. Outside Next
// (scripts, tests) there is no cache to refresh, so errors are swallowed — scripts call POST /revalidate at the end.

export async function revalidateCatalog(paths: string[] = []) {
  try {
    const { revalidateTag, revalidatePath } = await import('next/cache')
    revalidateTag('studios', 'max')
    for (const p of paths) revalidatePath(p)
  } catch {
    // not inside a Next request (script or test)
  }
}

/** Public URLs that show a studio: its profile and its city's catalogue pages. */
export const studioPaths = (slug: string, citySlug?: string | null) =>
  [`/vyrobnyky/${slug}`, ...(citySlug ? [`/vyrobnyky/misto/${citySlug}`, `/maister-klasy/${citySlug}`] : [])]
