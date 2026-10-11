import { NextResponse } from 'next/server'

import { appBackend } from '@/lib/backend'

// Public request form (incl. «Додати студію»). One endpoint for both backends during the move off Payload;
// the response is {ok, id} (plus doc.id, which older form code read from Payload's REST response).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'Порожній запит.' }, { status: 400 })

  if (appBackend()) {
    const { db } = await import('@/server/db')
    const { submitRequest } = await import('@/server/services/publicForms')
    const { clientIp } = await import('@/server/services/limits')
    const r = await submitRequest(db, body, clientIp(req.headers))
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error, field: r.field }, { status: r.status })
    return NextResponse.json({ ok: true, id: r.id, doc: { id: r.id } }, { status: 201 })
  }

  const { getPayload, ValidationError, APIError } = await import('payload')
  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })
  try {
    // overrideAccess false: the same public create access and validation hooks as the REST endpoint
    const doc = await payload.create({ collection: 'requests', data: body as never, overrideAccess: false, depth: 0 })
    return NextResponse.json({ ok: true, id: doc.id, doc: { id: doc.id } }, { status: 201 })
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ ok: false, error: e.data?.errors?.[0]?.message ?? 'Перевірте форму.', field: e.data?.errors?.[0]?.path }, { status: 400 })
    if (e instanceof APIError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status })
    throw e
  }
}
