import { chatRoutes } from '@/server/chatHttp'

// Chat: a contact typed into the panel's own field.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => chatRoutes.contact(req, (await ctx.params).id)
