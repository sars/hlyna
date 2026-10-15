import { jsonBody, kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { setPhotoCaption } from '@/server/services/kabinetPhotos'
import { Invalid } from '@/server/services/studioEditor'

// The caption of a photo the owner uploaded and that is still on review (optional; the editor writes the alt text).
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  return kabinetApi(req, { key: 'photo', max: 120 }, async (u) => {
    const body = (await jsonBody(req)) as { caption?: unknown }
    const mediaId = Number(id)
    if (!Number.isInteger(mediaId) || typeof body?.caption !== 'string') throw new Invalid('Не вдалося прочитати підпис.')
    return setPhotoCaption(db, { userId: u.id, slug, mediaId, caption: body.caption })
  })
}
