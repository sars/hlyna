import { NextResponse } from 'next/server'

import { appBackend } from '@/lib/backend'

import { OWNER_COOKIE } from '@/lib/ownerAuth'

export async function POST(req: Request) {
  if (appBackend()) {
    const { signOut } = await import('@/server/auth/kabinet-adapter')
    const out = await signOut(req.headers)
    const res = NextResponse.redirect(new URL('/kabinet/vhid', req.url), 303)
    for (const c of out.headers.getSetCookie()) res.headers.append('set-cookie', c)
    return res
  }
  const res = NextResponse.redirect(new URL('/kabinet/vhid', req.url), 303)
  res.cookies.set(OWNER_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
