import 'server-only'

import { zValidator } from '@hono/zod-validator'
import { Hono, type Context } from 'hono'
import { z } from 'zod'

import { REQUEST_STATUS } from '../../shared/options'
import { AuthError, type SignedInUser } from '../auth/access'
import { setPasswordAndSignIn } from '../auth/kabinet-adapter'
import { InviteError } from '../auth/invites'
import { requireRole } from '../auth/guards'
import { db } from '../db'
import type { Actor } from '../services/audit'
import { approveClaim, rejectClaim } from '../services/claims'
import { applyChangeSet, FIELD_ORDER, rejectChangeSet, type FieldKey } from '../services/changeSets'
import { NotFound, setRequestStatus, setRequestStudios, updateRequest } from '../services/requests'
import { searchStudios } from '../services/studios'

// /api/panel/* — the panel's writes and pickers. Reads for screens happen in server components. Every route except
// set-password requires staff (requireRole) and a same-origin request; every write goes through a service that
// writes the audit log.

type Env = { Variables: { user: SignedInUser; actor: Actor } }

const app = new Hono<Env>().basePath('/api/panel')

app.onError((err, c) => {
  if (err instanceof AuthError) return c.json({ error: err.message }, err.status)
  if (err instanceof NotFound) return c.json({ error: err.message }, 404)
  if (err instanceof InviteError) return c.json({ error: err.message, code: err.code }, 400)
  console.error('panel api error', err)
  return c.json({ error: 'Не вдалося виконати дію.' }, 500)
})

// The one public route: using a one-time link to set a password (signs the person in; Set-Cookie passes through).
app.post('/auth/set-password', zValidator('json', z.object({ token: z.string().min(10).max(200), login: z.string().min(3).max(254), password: z.string().min(1).max(200) })), async (c) => {
  const body = c.req.valid('json')
  return setPasswordAndSignIn({ ...body, headers: c.req.raw.headers })
})

const sameOrigin = (c: Context) => {
  const origin = c.req.header('origin')
  if (!origin) return true // same-origin fetch from older browsers; the session cookie is SameSite=Lax anyway
  try {
    return new URL(origin).host === (c.req.header('x-forwarded-host') ?? c.req.header('host'))
  } catch {
    return false
  }
}

app.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && !sameOrigin(c)) return c.json({ error: 'Запит з іншого сайту.' }, 403)
  const user = await requireRole(c.req.raw.headers, 'editor')
  c.set('user', user)
  c.set('actor', { id: user.id, source: 'panel' })
  await next()
})

const id = z.object({ id: z.coerce.number().int().positive() })

app.get('/studios/search', zValidator('query', z.object({ q: z.string().max(100) })), async (c) => c.json(await searchStudios(db, c.req.valid('query').q)))

app.post('/requests/:id/status', zValidator('param', id), zValidator('json', z.object({ status: z.enum(REQUEST_STATUS), note: z.string().trim().max(2000).optional() })), async (c) => {
  const { status, note } = c.req.valid('json')
  return c.json(await setRequestStatus(db, c.req.valid('param').id, status, c.get('actor'), note))
})

app.patch('/requests/:id', zValidator('param', id), zValidator('json', z.object({ notes: z.string().max(10000).nullable().optional(), dealAmountUah: z.number().nonnegative().max(100_000_000).nullable().optional() })), async (c) =>
  c.json(await updateRequest(db, c.req.valid('param').id, c.req.valid('json'), c.get('actor'))),
)

app.put('/requests/:id/studios', zValidator('param', id), zValidator('json', z.object({ studioIds: z.array(z.number().int().positive()).max(20) })), async (c) =>
  c.json(await setRequestStudios(db, c.req.valid('param').id, c.req.valid('json').studioIds, c.get('actor'))),
)

app.post('/claims/:id/approve', zValidator('param', id), zValidator('json', z.object({ linkToOwnerId: z.string().max(100).nullish() })), async (c) =>
  c.json(await approveClaim(db, c.req.valid('param').id, c.get('actor'), { linkToOwnerId: c.req.valid('json').linkToOwnerId })),
)

app.post('/claims/:id/reject', zValidator('param', id), zValidator('json', z.object({ reason: z.string().max(1000).default('') })), async (c) =>
  c.json(await rejectClaim(db, c.req.valid('param').id, c.req.valid('json').reason, c.get('actor'))),
)

const fieldKey = z.enum(FIELD_ORDER as [FieldKey, ...FieldKey[]])
app.post(
  '/change-sets/:id/apply',
  zValidator('param', id),
  zValidator(
    'json',
    z.object({
      accept: z.union([z.literal('all'), z.literal('all-but-text'), z.array(fieldKey).max(FIELD_ORDER.length)]),
      note: z.string().max(2000).optional(),
      publicDescription: z.string().max(8000).nullable().optional(),
      recentNote: z.string().max(1000).nullable().optional(),
      approveQuote: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const { accept, ...opts } = c.req.valid('json')
    return c.json(await applyChangeSet(db, c.req.valid('param').id, accept, c.get('actor'), opts))
  },
)

app.post('/change-sets/:id/reject', zValidator('param', id), zValidator('json', z.object({ note: z.string().max(2000).default('') })), async (c) =>
  c.json(await rejectChangeSet(db, c.req.valid('param').id, c.req.valid('json').note, c.get('actor'))),
)

export const panelApi = app
export type PanelApi = typeof app
