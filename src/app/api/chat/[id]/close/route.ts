import { chatRoutes } from '@/server/chatHttp'

// Chat: «Нова розмова» closes the visitor's thread.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => chatRoutes.close(req, (await ctx.params).id)
