// Liveness check for Docker and Caddy. Answers without touching the database.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ ok: true, time: new Date().toISOString() })
}
