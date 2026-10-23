import { z } from 'zod'

import { jsonBody, kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { Forbidden, loadOwned } from '@/server/services/kabinet'
import { getOrder, updateOrder } from '@/server/services/orders'
import { Invalid } from '@/server/services/studioEditor'

const patch = z.object({ tracking: z.string().max(60).optional(), studioNote: z.string().max(2000).optional() }).strict()

// The studio's tracking number (the buyer sees it) and its own note on the order.
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  return kabinetApi(req, { key: 'orders', max: 120 }, async (u) => {
    const l = await loadOwned(db, u.id, slug)
    if (!l) throw new Forbidden('Це не ваша студія.')
    const o = await getOrder(db, Number(id))
    if (!o || o.studioId !== l.s.id) throw new Forbidden('Це не ваше замовлення.')
    const p = patch.safeParse(await jsonBody(req))
    if (!p.success) throw new Invalid('Перевірте номер накладної й нотатку.')
    return updateOrder(db, o.id, p.data, { id: u.id, source: 'kabinet' })
  })
}
