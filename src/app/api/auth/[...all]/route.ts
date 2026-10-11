import { toNextJsHandler } from 'better-auth/next-js'

import { appBackend } from '@/lib/backend'
import { getAuth } from '../../../../server/auth'

// Better Auth endpoints (/api/auth/*): sign-in, sign-out, session. Sign-up, password reset by e-mail and profile
// edits are disabled (see DISABLED_PATHS); passwords are set only through our one-time links.
export const dynamic = 'force-dynamic'

// Before the cutover (DATA_BACKEND unset) sign-in still goes through Payload, so these endpoints are a 404.
const handler = (req: Request) =>
  appBackend() ? toNextJsHandler(getAuth())[req.method === 'GET' ? 'GET' : 'POST'](req) : new Response('Not found', { status: 404 })
export const GET = handler
export const POST = handler
