import { sql } from 'drizzle-orm'

import type { Db } from '../db'

// Fixed-window rate limit kept in Postgres (app.rate_limit, the table Better Auth also uses), so limits hold across
// app restarts and instances. Keys are prefixed «hl:» to stay apart from Better Auth's own keys.
// Returns true when this hit is over the limit.
export async function rateLimited(db: Db, key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const k = `hl:${key}`
  const rows = await db.execute<{ count: number }>(sql`
    insert into app.rate_limit (id, key, count, last_request)
    values (${k}, ${k}, 1, ${now})
    on conflict (key) do update set
      count = case when app.rate_limit.last_request < ${now - windowMs} then 1 else app.rate_limit.count + 1 end,
      last_request = case when app.rate_limit.last_request < ${now - windowMs} then ${now} else app.rate_limit.last_request end
    returning count
  `)
  return Number(rows.rows[0]?.count ?? 0) > max
}

export const clientIp = (headers: Headers) =>
  (headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'local').split(',')[0]!.trim()
