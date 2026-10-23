import { kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { unlinkOwnerTelegram } from '@/server/services/ownerTelegram'

// «Відключити» Telegram: new orders stop coming to the owner's chat (the link can be made again).
export async function POST(req: Request) {
  return kabinetApi(req, { key: 'telegram', max: 30 }, async (u) => {
    await unlinkOwnerTelegram(db, u.id, { id: u.id, source: 'kabinet' })
    return { ok: true }
  })
}
