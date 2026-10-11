import { NextResponse } from 'next/server'

import { payloadClient } from '@/lib/kabinet'
import { clientIp, normalizeLogin, OWNER_COOKIE, rateLimited, sessionValue, verifyPassword } from '@/lib/ownerAuth'

const MAX_FAILS = 5
const LOCK_MS = 15 * 60_000

export async function POST(req: Request) {
  const ip = clientIp(req.headers)
  if (rateLimited(`login:${ip}`, 10, LOCK_MS)) return NextResponse.json({ error: 'Забагато спроб. Спробуйте за 15 хвилин.' }, { status: 429 })
  const body = (await req.json().catch(() => null)) as Record<string, string> | null
  const login = normalizeLogin(body?.login ?? '')
  const password = body?.password ?? ''
  const fail = NextResponse.json({ error: 'Неправильний логін або пароль.' }, { status: 401 })
  if (!login || !password) return fail

  const payload = await payloadClient()
  const owner = (await payload.find({ collection: 'studio-owners', where: { login: { equals: login } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  if (!owner || !owner.active || !owner.passwordHash) return fail
  if (owner.lockUntil && new Date(owner.lockUntil) > new Date())
    return NextResponse.json({ error: 'Вхід тимчасово заблоковано після кількох помилок. Спробуйте за 15 хвилин.' }, { status: 429 })

  if (!verifyPassword(password, owner.passwordHash)) {
    const fails = (owner.failedLogins ?? 0) + 1
    await payload.update({
      collection: 'studio-owners',
      id: owner.id,
      data: { failedLogins: fails >= MAX_FAILS ? 0 : fails, lockUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null },
      overrideAccess: true,
      depth: 0,
    })
    return fail
  }
  await payload.update({ collection: 'studio-owners', id: owner.id, data: { failedLogins: 0, lockUntil: null, lastLoginAt: new Date().toISOString() }, overrideAccess: true, depth: 0 })
  const res = NextResponse.json({ ok: true })
  const s = sessionValue(owner.id, owner.passwordHash)
  res.cookies.set(OWNER_COOKIE, s.value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: s.maxAge })
  return res
}
