import { NextResponse } from 'next/server'

import { OWNER_COOKIE } from '@/lib/ownerAuth'

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL('/kabinet/vhid', req.url), 303)
  res.cookies.set(OWNER_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
