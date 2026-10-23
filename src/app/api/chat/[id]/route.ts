import { chatRoutes } from '@/server/chatHttp'

// Chat: one of the visitor's threads with its messages (switching threads without leaving the page).
export const dynamic = 'force-dynamic'
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => chatRoutes.get(req, (await ctx.params).id)
