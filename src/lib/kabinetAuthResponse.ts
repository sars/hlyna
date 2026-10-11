import { NextResponse } from 'next/server'

// Better Auth answers in its own JSON shape (English messages). The cabinet forms expect {ok} or {error} in Ukrainian,
// so translate the status and pass the session cookie through.
export async function kabinetAuthResponse(res: Response): Promise<NextResponse> {
  if (res.ok) {
    const out = NextResponse.json({ ok: true })
    for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
    return out
  }
  const body = (await res.json().catch(() => null)) as { message?: string } | null
  const ours = body?.message && /[а-яіїєґ]/i.test(body.message) ? body.message : null
  const error =
    ours ??
    (res.status === 429
      ? 'Забагато спроб. Спробуйте за 15 хвилин.'
      : res.status === 403
        ? 'Доступ вимкнено. Напишіть нам.'
        : 'Неправильний логін або пароль.')
  return NextResponse.json({ error }, { status: res.status === 401 || res.status === 400 ? 401 : res.status })
}
