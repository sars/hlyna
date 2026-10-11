import { NextResponse } from 'next/server'

import { db } from '@/server/db'
import { clientIp } from '@/server/services/limits'
import { submitClaim } from '@/server/services/publicForms'

// «Це ваша студія?» — a studio representative asks to manage the profile. Saved as a pending claim for an admin to verify.
export async function POST(req: Request) {
  const r = await submitClaim(db, await req.json().catch(() => null), clientIp(req.headers))
  return r.ok ? NextResponse.json({ ok: true, id: r.id }) : NextResponse.json({ error: r.error }, { status: r.status })
}
