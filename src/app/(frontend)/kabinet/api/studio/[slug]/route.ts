import { NextResponse } from 'next/server'

import { currentUser } from '@/server/auth/guards'
import { db } from '@/server/db'
import { Forbidden, submitOwnerEdit } from '@/server/services/kabinet'
import { clientIp, rateLimited } from '@/server/services/limits'
import { Invalid } from '@/server/services/studioEditor'

// Owner edits from /kabinet: the save becomes the studio's pending change set (photos are stored as pending media)
// for an editor to review and publish in /panel.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // During maintenance owner saves can pause for a few minutes (KABINET_FROZEN=1 in the server .env).
  if (process.env.KABINET_FROZEN === '1') return NextResponse.json({ error: 'Кабінет оновлюється, збереження буде доступне за кілька хвилин. Ваші зміни на сторінці не зникнуть — спробуйте ще раз трохи згодом.' }, { status: 503 })
  const u = await currentUser(req.headers)
  if (!u || u.role !== 'owner') return NextResponse.json({ error: 'Увійдіть знову.' }, { status: 401 })
  if (await rateLimited(db, `edit:${u.id}:${clientIp(req.headers)}`, 30, 3600_000)) return NextResponse.json({ error: 'Забагато збережень. Спробуйте пізніше.' }, { status: 429 })
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
