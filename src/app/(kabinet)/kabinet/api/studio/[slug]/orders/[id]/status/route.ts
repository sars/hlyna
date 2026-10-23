import { z } from 'zod'

import { jsonBody, kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { Forbidden, loadOwned } from '@/server/services/kabinet'
import { getOrder, notifyStatusToStaff, setOrderStatus } from '@/server/services/orders'
import { Invalid } from '@/server/services/studioEditor'
import { ORDER_STATUS } from '@/shared/options'

const body = z.object({ status: z.enum(ORDER_STATUS), reason: z.string().max(500).optional() })

// The studio moves its order along (only the steps lib/shop.ts nextStatuses allows); done and cancelled tell the owner's group.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  return kabinetApi(req, { key: 'orders', max: 120 }, async (u) => {
    const l = await loadOwned(db, u.id, slug)
    if (!l) throw new Forbidden('Це не ваша студія.')
    const o = await getOrder(db, Number(id))
    if (!o || o.studioId !== l.s.id) throw new Forbidden('Це не ваше замовлення.')
    const b = body.safeParse(await jsonBody(req))
    if (!b.success) throw new Invalid('Невідомий статус.')
    const r = await setOrderStatus(db, o.id, b.data.status, { id: u.id, source: 'kabinet' }, { by: 'studio', reason: b.data.reason })
    if (!r.already && (b.data.status === 'done' || b.data.status === 'cancelled')) {
      const fresh = await getOrder(db, o.id)
      if (fresh) await notifyStatusToStaff(fresh).catch(() => undefined)
    }
    return { ok: true, status: r.status }
  })
}
