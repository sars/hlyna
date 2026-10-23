import { NextResponse } from 'next/server'

import { db } from '@/server/db'
import { createCheckout } from '@/server/services/orders'
import { clientIp } from '@/server/services/limits'
import { revalidateItems } from '@/server/revalidate'

// The shop's checkout (src/components/shop/Checkout.client.tsx → src/server/services/orders.ts): the cart's item ids and
// quantities plus the buyer's details; answers {ok, token, orders} or {ok:false, error, field}.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ ok: false, error: 'Порожній запит.' }, { status: 400 })
  const r = await createCheckout(db, body, clientIp(req.headers))
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, field: r.field }, { status: r.status })
  // Stock may have changed (a one-off is gone once ordered): refresh the shop pages.
  await revalidateItems()
  return NextResponse.json(r, { status: 201 })
}
