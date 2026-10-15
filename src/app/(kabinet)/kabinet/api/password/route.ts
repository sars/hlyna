import { NextResponse } from 'next/server'

import { kabinetAuthResponse } from '@/server/auth/kabinet-response'
import { setPasswordAndSignIn } from '@/server/auth/kabinet-adapter'

// One-time link from an approved claim: the owner picks a login (email or phone) and a password, then is signed in.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, string> | null
  const token = body?.token?.trim() ?? ''
  if (!token) return NextResponse.json({ error: 'Посилання неповне.' }, { status: 400 })
  if ((body?.password ?? '').length < 10) return NextResponse.json({ error: 'Пароль — щонайменше 10 символів.' }, { status: 400 })
  try {
    const res = await setPasswordAndSignIn({ token, login: String(body?.login ?? '').trim(), password: String(body?.password ?? ''), headers: req.headers })
    return kabinetAuthResponse(res)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Посилання недійсне або застаріло. Напишіть нам — надішлемо нове.' }, { status: 400 })
  }
}
