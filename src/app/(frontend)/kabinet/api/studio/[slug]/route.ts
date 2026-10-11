import { NextResponse } from 'next/server'

import { appBackend } from '@/lib/backend'

import { currentOwner, MAX_PHOTOS, ownedStudio, payloadClient } from '@/lib/kabinet'
import { clientIp, rateLimited } from '@/lib/ownerAuth'
import { notifyOwnerTelegram, ownerEditKeyboard } from '@/lib/telegram'
import type { Studio } from '@/payload-types'

const MAX_FILE = 8 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const lines = (v: unknown, max = 40) =>
  (Array.isArray(v) ? v : [])
    .map((x) => text(x, 300))
    .filter(Boolean)
    .slice(0, max)
    .map((t) => ({ text: t }))
const url = (v: unknown) => {
  const s = text(v, 300)
  if (!s) return ''
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(withProto).toString()
  } catch {
    return ''
  }
}

// Owner edits from /kabinet: only the allowed fields, saved as a draft version for an admin to review and publish.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // During the switch to the new data store owner saves pause for a few minutes (deploy/cutover.sh sets this).
  if (process.env.KABINET_FROZEN === '1') return NextResponse.json({ error: 'Кабінет оновлюється, збереження буде доступне за кілька хвилин. Ваші зміни на сторінці не зникнуть — спробуйте ще раз трохи згодом.' }, { status: 503 })
  if (appBackend()) return saveOnApp(req, params)
  const owner = await currentOwner()
  if (!owner) return NextResponse.json({ error: 'Увійдіть знову.' }, { status: 401 })
  if (rateLimited(`edit:${owner.id}:${clientIp(req.headers)}`, 30, 3600_000)) return NextResponse.json({ error: 'Забагато збережень. Спробуйте пізніше.' }, { status: 429 })
  const { slug } = await params
  const studio = await ownedStudio(owner, slug)
  if (!studio) return NextResponse.json({ error: 'Немає доступу до цієї студії.' }, { status: 403 })

  const form = await req.formData()
  const d = JSON.parse(String(form.get('data') ?? '{}')) as Record<string, unknown>
  const b2b = (d.b2b ?? {}) as Record<string, unknown>
  const payload = await payloadClient()

  // Photos: keep the ones the owner didn't remove, add new uploads (alt text required), at most MAX_PHOTOS.
  const keep = new Set((Array.isArray(d.keepPhotos) ? d.keepPhotos : []).map(Number))
  const photoIds = (studio.photos ?? []).map((p) => (typeof p === 'object' ? p.id : p)).filter((id) => keep.has(id))
  const files = form.getAll('newPhotos').filter((f): f is File => f instanceof File && f.size > 0)
  const alts = form.getAll('newAlts').map((a) => text(a, 200))
  for (const [i, file] of files.entries()) {
    if (photoIds.length >= MAX_PHOTOS) break
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_FILE) return NextResponse.json({ error: `Фото «${file.name}»: лише JPG, PNG або WebP до 8 МБ.` }, { status: 400 })
    if (!alts[i]) return NextResponse.json({ error: `Додайте короткий опис до фото «${file.name}».` }, { status: 400 })
    const media = await payload.create({
      collection: 'media',
      data: { alt: `${alts[i]} — ${studio.name}` },
      file: { data: Buffer.from(await file.arrayBuffer()), mimetype: file.type, name: `${slug}-${Date.now()}-${i}.${file.type.split('/')[1]}`, size: file.size },
      overrideAccess: true,
    })
    photoIds.push(media.id)
  }

  const now = new Date()
  const ownerSource = `від студії, ${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
  const igPosts = (Array.isArray(d.instagramPosts) ? d.instagramPosts : [])
    .map((u) => text(u, 200))
    .filter((u) => /^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(u))
    .slice(0, 3)
    .map((u) => ({ url: u }))

  const data: Partial<Studio> = {
    // Free text from the owner is kept internal: we rewrite it in the site voice before anything is published.
    ownerAbout: text(d.ownerAbout, 4000),
    ownerNews: text(d.ownerNews, 600),
    ownerQuote: text(d.ownerQuote, 200),
    ownerQuoteApproved: text(d.ownerQuote, 200) === (studio.ownerQuote ?? '') ? Boolean(studio.ownerQuoteApproved) : false,
    services: lines(d.services),
    products: lines(d.products),
    prices: (Array.isArray(d.prices) ? d.prices : [])
      .map((p) => p as Record<string, unknown>)
      // A line the owner left as it was keeps its original source; new or edited lines are «від студії».
      .map((p) => {
        const t = text(p.text, 300)
        const old = (studio.prices ?? []).find((x) => x.text === t)
        return { text: t, date: text(p.date, 60), source: old && text(p.source, 120) === (old.source ?? '') ? old.source ?? '' : ownerSource }
      })
      .filter((p) => p.text)
      .slice(0, 40),
    address: text(d.address, 300),
    website: url(d.website),
    instagram: url(d.instagram),
    phone: text(d.phone, 60),
    email: text(d.email, 120),
    b2b: {
      ...studio.b2b,
      minOrder: text(b2b.minOrder, 200),
      leadTime: text(b2b.leadTime, 200),
      logoMethods: lines(b2b.logoMethods, 10),
      foodSafe: b2b.foodSafe === true,
      dishwasherSafe: b2b.dishwasherSafe === true,
      worksWithHoreca: b2b.worksWithHoreca === true,
      worksWithCorporate: b2b.worksWithCorporate === true,
    },
    photos: photoIds,
    activity: { ...studio.activity, instagramPosts: igPosts },
    consent: { ...studio.consent, photos: photoIds.length > 0 ? true : Boolean(studio.consent?.photos) },
    pendingOwnerChanges: true,
  }

  await payload.update({ collection: 'studios', id: studio.id, data, draft: true, overrideAccess: true, depth: 0, context: { ownerEdit: true } })
  await notifyOwnerTelegram([
    `Зміни від власника: ${studio.name}`,
    `${owner.name}${files.length ? `, нових фото: ${files.length}` : ''}${text(d.ownerAbout, 10) || text(d.ownerNews, 10) ? ', є текст «своїми словами» — перепишіть голосом сайту' : ''}`,
  ], ownerEditKeyboard(studio.id))
  return NextResponse.json({ ok: true })
}

// New stack: the save becomes the studio's pending change set; photos are stored as pending media.
async function saveOnApp(req: Request, params: Promise<{ slug: string }>) {
  const { currentUser } = await import('@/server/auth/guards')
  const { db } = await import('@/server/db')
  const { rateLimited, clientIp: ipOf } = await import('@/server/services/limits')
  const { submitOwnerEdit, Forbidden } = await import('@/server/services/kabinet')
  const { Invalid } = await import('@/server/services/studioEditor')
  const u = await currentUser(req.headers)
  if (!u || u.role !== 'owner') return NextResponse.json({ error: 'Увійдіть знову.' }, { status: 401 })
  if (await rateLimited(db, `edit:${u.id}:${ipOf(req.headers)}`, 30, 3600_000)) return NextResponse.json({ error: 'Забагато збережень. Спробуйте пізніше.' }, { status: 429 })
  const { slug } = await params
  const form = await req.formData()
  const data = JSON.parse(String(form.get('data') ?? '{}')) as unknown
  const files = form.getAll('newPhotos').filter((f): f is File => f instanceof File && f.size > 0)
  const alts = form.getAll('newAlts').map((a) => String(a).trim().slice(0, 200))
  try {
    const photos = await Promise.all(files.map(async (f, i) => ({ bytes: Buffer.from(await f.arrayBuffer()), fileName: f.name, mime: f.type, alt: alts[i] ?? '' })))
    await submitOwnerEdit(db, { userId: u.id, ownerName: u.name, slug, data, photos })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Forbidden) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof Invalid) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}
