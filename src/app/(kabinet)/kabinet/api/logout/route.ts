import { NextResponse } from 'next/server'

import { signOut } from '@/server/auth/kabinet-adapter'

export async function POST(req: Request) {
  const out = await signOut(req.headers)
  const res = NextResponse.redirect(new URL('/kabinet/vhid', req.url), 303)
  for (const c of out.headers.getSetCookie()) res.headers.append('set-cookie', c)
  return res
}
