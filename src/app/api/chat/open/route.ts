import { chatRoutes } from '@/server/chatHttp'

// Chat: the visitor's open conversation on this page, or a new one (sets the visitor cookie).
export const POST = (req: Request) => chatRoutes.open(req)
