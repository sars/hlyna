import { NextResponse } from 'next/server'

import { appBackend } from '@/lib/backend'

import { payloadClient } from '@/lib/kabinet'
import { clientIp, rateLimited } from '@/lib/ownerAuth'
import { claimKeyboard, notifyOwnerTelegram } from '@/lib/telegram'

// «Це ваша студія?» — a studio representative asks to manage the profile. Saved as a pending claim for an admin to verify.
export async function POST(req: Request) {
  if (appBackend()) {
    const { db } = await import('@/server/db')
    const { submitClaim } = await import('@/server/services/publicForms')
    const { clientIp } = await import('@/server/services/limits')
    const r = await submitClaim(db, await req.json().catch(() => null), clientIp(req.headers))
    return r.ok ? NextResponse.json({ ok: true, id: r.id }) : NextResponse.json({ error: r.error }, { status: r.status })
  }
  const ip = clientIp(req.headers)
  if (rateLimited(`claim:${ip}`, 5, 3600_000)) return NextResponse.json({ error: 'Забагато заявок. Спробуйте пізніше.' }, { status: 429 })
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Порожня заявка.' }, { status: 400 })
  if (typeof body.website2 === 'string' && body.website2) return NextResponse.json({ ok: true }) // honeypot

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const name = str(body.name, 120)
  const contact = str(body.contact, 160)
  const slug = str(body.studio, 200)
  const others = Array.isArray(body.otherStudios) ? body.otherStudios.map((s) => str(s, 200)).filter(Boolean).slice(0, 5) : []
  if (!name || !contact || !slug) return NextResponse.json({ error: "Вкажіть ім'я і контакт." }, { status: 400 })
  if (body.represents !== true) return NextResponse.json({ error: 'Підтвердьте, що представляєте студію.' }, { status: 400 })

  const payload = await payloadClient()
  const found = await payload.find({
    collection: 'studios',
    where: { slug: { in: [slug, ...others] }, _status: { equals: 'published' } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
    select: { name: true, slug: true },
  })
  const main = found.docs.find((d) => d.slug === slug)
  if (!main) return NextResponse.json({ error: 'Студію не знайдено.' }, { status: 404 })
  const otherDocs = found.docs.filter((d) => d.slug !== slug)

  const claim = await payload.create({
    collection: 'claims',
    data: { studio: main.id, otherStudios: otherDocs.map((d) => d.id), name, contact, represents: true, status: 'pending' },
    overrideAccess: true,
    depth: 0,
  })
  await notifyOwnerTelegram([
    `Заявка на профіль #${claim.id}: ${[main.name, ...otherDocs.map((d) => d.name)].join(', ')}`,
    `Від: ${name}, ${contact}`,
  ], claimKeyboard(claim.id))
  return NextResponse.json({ ok: true, id: claim.id })
}
