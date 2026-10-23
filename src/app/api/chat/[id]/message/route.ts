import { chatRoutes } from '@/server/chatHttp'

// Chat: the visitor wrote; the answer streams back as server-sent events.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => chatRoutes.message(req, (await ctx.params).id)
