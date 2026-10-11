import { handle } from 'hono/vercel'

import { appBackend } from '@/lib/backend'
import { panelApi } from '@/server/api/panel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const hono = handle(panelApi)
// Before the cutover (DATA_BACKEND unset) the panel API does not exist.
const h = (req: Request) => (appBackend() ? hono(req) : new Response('Not found', { status: 404 }))
export { h as GET, h as POST, h as PUT, h as PATCH, h as DELETE }
