import { toNextJsHandler } from 'better-auth/next-js'

import { getAuth } from '../../../../server/auth'

// Better Auth endpoints (/api/auth/*): sign-in, sign-out, session. Sign-up, password reset by e-mail and profile
// edits are disabled (see DISABLED_PATHS); passwords are set only through our one-time links.
export const dynamic = 'force-dynamic'

const handler = (req: Request) => toNextJsHandler(getAuth())[req.method === 'GET' ? 'GET' : 'POST'](req)
export const GET = handler
export const POST = handler
