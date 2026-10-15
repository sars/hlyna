import { jsonBody, kabinetApi } from '@/server/api/kabinetRoute'
import { db } from '@/server/db'
import { addPhoto, photosOf, setPhotoOrder } from '@/server/services/kabinetPhotos'
import { Invalid } from '@/server/services/studioEditor'

// Owner photos from /kabinet: each call saves at once into the studio's pending change set (new files are pending media).
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return kabinetApi(req, { key: 'photo-read', max: 600 }, (u) => photosOf(db, { userId: u.id, slug }))
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return kabinetApi(req, { key: 'photo', max: 120 }, async (u) => {
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File) || !file.size) throw new Invalid('Виберіть фото.')
    const caption = form?.get('caption')
    return addPhoto(db, { userId: u.id, slug, bytes: Buffer.from(await file.arrayBuffer()), fileName: file.name, mime: file.type, caption: typeof caption === 'string' ? caption : undefined })
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return kabinetApi(req, { key: 'photo', max: 120 }, async (u) => {
    const body = (await jsonBody(req)) as { order?: unknown; known?: unknown }
    if (!Array.isArray(body?.order)) throw new Invalid('Не вдалося прочитати порядок фото.')
    return setPhotoOrder(db, { userId: u.id, slug, order: body.order.map(Number), known: Array.isArray(body.known) ? body.known.map(Number) : undefined })
  })
}
