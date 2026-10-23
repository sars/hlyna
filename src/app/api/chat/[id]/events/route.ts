import { chatRoutes } from '@/server/chatHttp'

// Chat: a person's replies, status and presence as server-sent events while the panel is open.
export const dynamic = 'force-dynamic'
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => chatRoutes.events(req, (await ctx.params).id)
