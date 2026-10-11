// One-time set-password link for a user (staff → /panel/parol, owner → /kabinet/parol). After cutover the Payload admin
// account needs one of these. Prints the link; send it yourself. PROD=1 for production.
//   USER_ID=<user id | email | login> BASE=https://hlyna.com.ua pnpm tsx scripts/app/invite.ts
import { eq, or } from 'drizzle-orm'

import { guard } from './_guard'
import { db, pool } from '../../src/server/db'
import { user } from '../../src/server/db/schema/auth'
import { createInvite } from '../../src/server/auth/invites'
import { audit } from '../../src/server/services/audit'

guard('invite')
const who = (process.env.USER_ID || '').trim()
const [u] = await db.select({ id: user.id, name: user.name, role: user.role }).from(user).where(or(eq(user.id, who), eq(user.email, who.toLowerCase()), eq(user.username, who.toLowerCase()))).limit(1)
if (!u) {
  console.error(`invite: no user «${who}»`)
  process.exit(1)
}
const r = await createInvite(db, { userId: u.id, baseUrl: process.env.BASE || 'https://hlyna.com.ua' })
await audit(db, { id: null, source: 'script:invite' }, 'user', u.id, 'invite', null)
console.log(`${u.name} (${u.role}): ${r.link}\nvalid until ${r.expiresAt.toISOString()}`)
await pool.end()
