// A stand-in for the Telegram Bot API for end-to-end checks: records every call, answers like Telegram, and lets a
// test play the owner or a visitor by posting updates to the app's webhook.
//   TELEGRAM_API_BASE=http://localhost:3999 TELEGRAM_BOT_TOKEN=fake TELEGRAM_CHAT_ID=777 TELEGRAM_WEBHOOK_SECRET=s pnpm dev
//   node scripts/smoke/fake-telegram.mjs      (port 3999; GET /_sent lists calls, DELETE /_sent clears them)
import http from 'node:http'

const sent = []
let nextId = 1000
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/_sent') {
    if (req.method === 'DELETE') sent.length = 0
    res.setHeader('content-type', 'application/json')
    return res.end(JSON.stringify(sent))
  }
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const m = url.pathname.match(/^\/bot[^/]+\/(\w+)$/)
    const method = m?.[1] ?? '?'
    let params = {}
    try {
      params = JSON.parse(body || '{}')
    } catch {}
    const entry = { method, params, at: new Date().toISOString() }
    let result = true
    if (method === 'sendMessage') {
      entry.message_id = ++nextId
      result = { message_id: entry.message_id, chat: { id: params.chat_id } }
    } else if (method === 'getMe') result = { username: 'hlyna_fake_bot' }
    sent.push(entry)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true, result }))
  })
})
server.listen(3999, () => console.log('fake telegram on :3999'))
