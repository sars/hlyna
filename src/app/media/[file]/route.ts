import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { MEDIA_DIR } from '@/server/media'

// Uploaded images. In production Caddy serves /media/* straight from the volume and this route is never reached;
// it is here for local runs (next dev / next start without Caddy).
const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = path.basename(decodeURIComponent((await params).file))
  const type = TYPES[path.extname(name).toLowerCase()]
  if (!type) return new Response('Not found', { status: 404 })
  const file = path.join(MEDIA_DIR(), name)
  try {
    await stat(file)
    return new Response(new Uint8Array(await readFile(file)), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
