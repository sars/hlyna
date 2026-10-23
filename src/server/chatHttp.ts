import { createHash } from 'node:crypto'

import { chatHttp } from '@/chat/server/http'

import { chat, chatEnabled } from './chatAdapter'
import { clientIp } from './services/limits'

// The chat module's HTTP handlers bound to this site (routes under src/app/api/chat are one line each).
export const chatRoutes = chatHttp({
  chat,
  enabled: chatEnabled,
  clientIp,
  ipHash: (ip) => createHash('sha256').update(`${process.env.BETTER_AUTH_SECRET ?? 'hlyna'}:${ip}`).digest('hex').slice(0, 32),
})
