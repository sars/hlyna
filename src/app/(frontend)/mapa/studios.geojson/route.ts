import { studiosGeoJSON } from '@/lib/mapData'

// Data for the map on /mapa (cached with the catalogue, refreshed on studio changes).
export const revalidate = 3600

export async function GET() {
  return new Response(JSON.stringify(await studiosGeoJSON()), {
    headers: { 'Content-Type': 'application/geo+json; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=3600' },
  })
}
