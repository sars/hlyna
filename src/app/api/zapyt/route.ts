import { NextResponse } from 'next/server'

import { db } from '@/server/db'
import { clientIp } from '@/server/services/limits'
import { submitRequest } from '@/server/services/publicForms'

// Public request form (incl. «Додати студію»). The response is {ok, id} (plus doc.id, which older form code read).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'Порожній запит.' }, { status: 400 })

  const r = await submitRequest(db, body, clientIp(req.headers))
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, field: r.field }, { status: r.status })
  return NextResponse.json({ ok: true, id: r.id, doc: { id: r.id } }, { status: 201 })
}
