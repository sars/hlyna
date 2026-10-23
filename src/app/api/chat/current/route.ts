import { chatRoutes } from '@/server/chatHttp'

// Chat: restore the visitor's open conversation when a page loads (null without a cookie).
export const dynamic = 'force-dynamic'
export const GET = (req: Request) => chatRoutes.current(req)
