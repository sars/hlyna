import { NextResponse } from 'next/server'

import { getAllStudios } from '@/lib/catalog'

// Name search for «ще мої профілі» in the claim form: published studios only, public fields only.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json([])
  const all = await getAllStudios()
  const hits = all
    .filter((s) => s.name.toLowerCase().includes(q) || (s.instagram ?? '').toLowerCase().includes(q))
    .slice(0, 8)
    .map((s) => ({ slug: s.slug, name: s.name, city: s.cityDoc?.name ?? '' }))
  return NextResponse.json(hits)
}
