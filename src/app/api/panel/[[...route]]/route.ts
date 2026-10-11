import { handle } from 'hono/vercel'

import { panelApi } from '@/server/api/panel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const h = handle(panelApi)
export { h as GET, h as POST, h as PUT, h as PATCH, h as DELETE }
