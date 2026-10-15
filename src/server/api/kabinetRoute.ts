import { NextResponse } from 'next/server'

import { currentUser } from '@/server/auth/guards'
import { db } from '@/server/db'
import { FieldErrors, Forbidden } from '@/server/services/kabinet'
import { clientIp, rateLimited } from '@/server/services/limits'
import { Invalid } from '@/server/services/studioEditor'

// The guards every owner API in /kabinet/api/studio shares: maintenance pause, owner session, rate limit, and the
// answers for the service errors (Forbidden → 403, FieldErrors/Invalid → 400 with Ukrainian text).
export async function kabinetApi(
  req: Request,
  limit: { key: string; max: number },
  run: (user: { id: string; name: string }) => Promise<unknown>,
): Promise<NextResponse> {
  // During maintenance owner saves can pause for a few minutes (KABINET_FROZEN=1 in the server .env).
  if (process.env.KABINET_FROZEN === '1') return NextResponse.json({ error: 'Кабінет оновлюється, збереження буде доступне за кілька хвилин. Ваші зміни на сторінці не зникнуть — спробуйте ще раз трохи згодом.' }, { status: 503 })
  const u = await currentUser(req.headers)
  if (!u || u.role !== 'owner') return NextResponse.json({ error: 'Увійдіть знову.' }, { status: 401 })
  if (await rateLimited(db, `${limit.key}:${u.id}:${clientIp(req.headers)}`, limit.max, 3600_000)) return NextResponse.json({ error: 'Забагато збережень. Спробуйте пізніше.' }, { status: 429 })
  try {
    return NextResponse.json(await run(u))
  } catch (e) {
    if (e instanceof Forbidden) return NextResponse.json({ error: e.message }, { status: 403 })
    if (e instanceof FieldErrors) return NextResponse.json({ error: e.message, fields: e.fields }, { status: 400 })
    if (e instanceof Invalid) return NextResponse.json({ error: e.message }, { status: 400 })
    throw e
  }
}

/** The JSON body of a request, or an Invalid for the route's 400. */
export async function jsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new Invalid('Не вдалося прочитати дані. Оновіть сторінку й спробуйте ще раз.')
  }
}
