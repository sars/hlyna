import { NextResponse } from 'next/server'

import { getAllWithShops, igHandle } from '@/lib/catalog'

// Generic words dropped before comparing names, so «Студія кераміки «Осоння»» matches «Osonnya»-free «Осоння».
const GENERIC = /(?<!\p{L})(студія|студио|майстерня|кераміки|кераміка|гончарна|творча|ceramics|ceramic|studio|pottery)(?!\p{L})/gu
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[«»"'’ʼ`]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(GENERIC, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const handleOf = (s: string) =>
  s.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').split(/[/?\s]/)[0].toLowerCase()

// Published studios only, public fields only.
// ?q=          name search for «ще мої профілі» in the claim form.
// ?name=&ig=   new-studio form: is this studio already in the catalogue (name, alternate names or Instagram handle)?
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const all = await getAllWithShops()
  const out = (list: typeof all) =>
    NextResponse.json(list.slice(0, 8).map((s) => ({ slug: s.slug, name: s.name, city: s.cityDoc?.name ?? '' })))

  if (sp.has('name') || sp.has('ig')) {
    const name = norm(sp.get('name') || '')
    const ig = handleOf(sp.get('ig') || '')
    if (name.length < 3 && ig.length < 3) return NextResponse.json([])
    return out(
      all.filter((s) => {
        if (ig.length >= 3 && igHandle(s.instagram).toLowerCase() === ig) return true
        if (name.length < 3) return false
        const names = [s.name, ...(s.alternateNames ?? []).map((a) => a.text)].map(norm).filter((n) => n.length >= 3)
        return names.some((n) => n === name || (name.length >= 5 && n.includes(name)) || (n.length >= 5 && name.includes(n)))
      }),
    )
  }

  const q = (sp.get('q') || '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json([])
  return out(all.filter((s) => s.name.toLowerCase().includes(q) || (s.instagram ?? '').toLowerCase().includes(q)))
}
