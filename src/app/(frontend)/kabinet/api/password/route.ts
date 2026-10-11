import { NextResponse } from 'next/server'

import { payloadClient } from '@/lib/kabinet'
import { clientIp, hashPassword, hashToken, normalizeLogin, OWNER_COOKIE, rateLimited, sessionValue } from '@/lib/ownerAuth'

// One-time link from an approved claim: the owner picks a login (email or phone) and a password, then is signed in.
export async function POST(req: Request) {
  if (rateLimited(`pw:${clientIp(req.headers)}`, 10, 900_000)) return NextResponse.json({ error: 'Забагато спроб. Спробуйте за 15 хвилин.' }, { status: 429 })
  const body = (await req.json().catch(() => null)) as Record<string, string> | null
  const token = body?.token?.trim() ?? ''
  const login = normalizeLogin(body?.login ?? '')
  const password = body?.password ?? ''
  if (!token) return NextResponse.json({ error: 'Посилання неповне.' }, { status: 400 })
  if (!login) return NextResponse.json({ error: 'Логін — це email або номер телефону.' }, { status: 400 })
  if (password.length < 10) return NextResponse.json({ error: 'Пароль — щонайменше 10 символів.' }, { status: 400 })

  const payload = await payloadClient()
  const owner = (
    await payload.find({ collection: 'studio-owners', where: { inviteTokenHash: { equals: hashToken(token) } }, depth: 0, limit: 1, overrideAccess: true })
  ).docs[0]
  if (!owner || !owner.inviteExpires || new Date(owner.inviteExpires) < new Date() || !owner.active)
    return NextResponse.json({ error: 'Посилання недійсне або застаріло. Напишіть нам — надішлемо нове.' }, { status: 400 })

  const taken = (await payload.find({ collection: 'studio-owners', where: { login: { equals: login } }, depth: 0, limit: 1, overrideAccess: true })).docs[0]
  if (taken && taken.id !== owner.id) return NextResponse.json({ error: 'Цей логін уже зайнятий.' }, { status: 400 })

  const passwordHash = hashPassword(password)
  await payload.update({
    collection: 'studio-owners',
    id: owner.id,
    data: { login, passwordHash, inviteTokenHash: null, inviteExpires: null, inviteLink: 'Використано', failedLogins: 0, lockUntil: null, lastLoginAt: new Date().toISOString() },
    overrideAccess: true,
    depth: 0,
  })
  const res = NextResponse.json({ ok: true })
  const s = sessionValue(owner.id, passwordHash)
  res.cookies.set(OWNER_COOKIE, s.value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: s.maxAge })
  return res
}
