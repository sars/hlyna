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
import { approveClaim, reissueClaimInvite, rejectClaim } from '../services/claims'
import { applyChangeSet, FIELD_ORDER, rejectChangeSet, type FieldKey } from '../services/changeSets'
import { NotFound, setRequestStatus, setRequestStudios, updateRequest } from '../services/requests'
import { searchStudios } from '../services/studios'
import { Conflict, Invalid, restoreRevision, saveStudio, revisionChanges } from '../services/studioEditor'
import { createCity, saveCity } from '../services/cities'
import { deleteMedia, MAX_BYTES, updateMedia, uploadImage } from '../media'
import { createOwner, createStaff, issueInvite, revokeAllSessions, revokeSession, setActive, setOwnerStudios, setRole } from '../services/users'
import { geocode } from '../geo/nominatim'
import { studioEdit } from '../../shared/schemas'
import { hasStaffRole } from '../auth/roles'
import { eq } from 'drizzle-orm'
import { media as mediaTable } from '../db/schema/catalog'

// /api/panel/* — the panel's writes and pickers. Reads for screens happen in server components. Every route except
// set-password requires staff (requireRole) and a same-origin request; every write goes through a service that
// writes the audit log.

type Env = { Variables: { user: SignedInUser; actor: Actor } }

const app = new Hono<Env>().basePath('/api/panel')

app.onError((err, c) => {
  if (err instanceof AuthError) return c.json({ error: err.message }, err.status)
  if (err instanceof NotFound) return c.json({ error: err.message }, 404)
  if (err instanceof InviteError) return c.json({ error: err.message, code: err.code }, 400)
  if (err instanceof Invalid) return c.json({ error: err.message }, 400)
  if (err instanceof Conflict) return c.json({ error: err.message, current: err.current, changes: err.changes, by: err.by }, 409)
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

app.post('/claims/:id/invite', zValidator('param', id), async (c) => c.json(await reissueClaimInvite(db, c.req.valid('param').id, c.get('actor'))))

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

// ---------------------------------------------------------------- studios

// Form validation errors come back as one readable sentence plus the field, so the editor can mark it.
const readable = <T,>(result: { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }, c: Context) => {
  if (result.success) return
  const issue = result.error.issues[0]
  return c.json({ error: issue?.message ?? 'Перевірте поля форми.', field: issue ? String(issue.path[0] ?? '') : null }, 400)
}

app.put('/studios/:id', zValidator('param', id), zValidator('json', studioEdit, readable), async (c) => c.json(await saveStudio(db, c.req.valid('param').id, c.req.valid('json'), c.get('actor'))))

app.get('/studios/:id/revisions/:rid', zValidator('param', z.object({ id: z.coerce.number().int().positive(), rid: z.coerce.number().int().positive() })), async (c) => {
  const { id: sid, rid } = c.req.valid('param')
  const r = await revisionChanges(db, sid, rid)
  if (!r) return c.json({ error: 'Версію не знайдено.' }, 404)
  return c.json({ changes: r.changes, revision: r.revision.revision, createdAt: r.revision.createdAt })
})

app.post(
  '/studios/:id/restore',
  zValidator('param', id),
  zValidator('json', z.object({ revisionId: z.number().int().positive(), expectedRevision: z.number().int().positive() })),
  async (c) => {
    const { revisionId, expectedRevision } = c.req.valid('json')
    return c.json(await restoreRevision(db, c.req.valid('param').id, revisionId, expectedRevision, c.get('actor')))
  },
)

app.post(
  '/geocode',
  zValidator('json', z.object({ address: z.string().max(300).nullable(), city: z.string().min(1).max(120), oblast: z.string().max(120).nullish() })),
  async (c) => {
    const { address, city, oblast } = c.req.valid('json')
    try {
      const hit = await geocode(address, city, oblast)
      return hit ? c.json(hit) : c.json({ error: 'Не знайшли ні адреси, ні міста.' }, 404)
    } catch {
      return c.json({ error: 'Сервіс OpenStreetMap не відповів. Спробуйте за хвилину.' }, 502)
    }
  },
)

// ---------------------------------------------------------------- cities

const cityBody = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Лише латиниця, цифри й дефіси.').max(120),
  oblast: z.string().trim().max(120).nullable(),
  locative: z.string().trim().max(120).nullable(),
  population: z.number().int().nonnegative().nullable(),
  isOver100k: z.boolean().nullable(),
})
app.post('/cities', zValidator('json', cityBody), async (c) => c.json(await createCity(db, c.req.valid('json'), c.get('actor'))))
app.put('/cities/:id', zValidator('param', id), zValidator('json', cityBody), async (c) => c.json(await saveCity(db, c.req.valid('param').id, c.req.valid('json'), c.get('actor'))))

// ---------------------------------------------------------------- media

app.post('/media', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return c.json({ error: 'Оберіть файл.' }, 400)
  if (file.size > MAX_BYTES) return c.json({ error: 'Фото більше 8 МБ.' }, 400)
  const alt = String(form.get('alt') ?? '')
  const studioSlug = form.get('studioSlug') ? String(form.get('studioSlug')) : null
  return c.json(await uploadImage(db, { bytes: Buffer.from(await file.arrayBuffer()), fileName: file.name, alt, studioSlug }, c.get('actor')))
})
app.get('/media/:id', zValidator('param', id), async (c) => {
  const [m] = await db.select().from(mediaTable).where(eq(mediaTable.id, c.req.valid('param').id)).limit(1)
  if (!m) return c.json({ error: 'Фото не знайдено.' }, 404)
  return c.json({ id: m.id, fileName: m.fileName, alt: m.alt, thumb: m.variants?.thumbnail?.file ?? null, status: m.status })
})
app.patch('/media/:id', zValidator('param', id), zValidator('json', z.object({ alt: z.string().max(300).optional(), caption: z.string().max(1000).nullable().optional() })), async (c) =>
  c.json(await updateMedia(db, c.req.valid('param').id, c.req.valid('json'), c.get('actor'))),
)
app.delete('/media/:id', zValidator('param', id), async (c) => {
  if (!hasStaffRole(c.get('user').role, 'admin')) return c.json({ error: 'Видаляти фото може лише адміністратор.' }, 403)
  return c.json(await deleteMedia(db, c.req.valid('param').id, c.get('actor')))
})

// ---------------------------------------------------------------- users (admins only)

const adminOnly = async (c: Context<Env>, next: () => Promise<void>) => {
  if (!hasStaffRole(c.get('user').role, 'admin')) return c.json({ error: 'Лише для адміністратора.' }, 403)
  await next()
}
const SITE = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'https://hlyna.com.ua').replace(/\/$/, '')
const uid = z.object({ id: z.string().min(1).max(100) })

app.post('/users/staff', adminOnly, zValidator('json', z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(254), role: z.enum(['admin', 'editor']) })), async (c) =>
  c.json(await createStaff(db, c.req.valid('json'), c.get('actor'), SITE())),
)
app.post('/users/owners', adminOnly, zValidator('json', z.object({ name: z.string().trim().min(1).max(120), contact: z.string().trim().max(200).nullable(), studioIds: z.array(z.number().int().positive()).min(1).max(20) })), async (c) =>
  c.json(await createOwner(db, c.req.valid('json'), c.get('actor'), SITE())),
)
app.post('/users/:id/invite', adminOnly, zValidator('param', uid), async (c) => c.json(await issueInvite(db, c.req.valid('param').id, c.get('actor'), SITE())))
app.patch('/users/:id', adminOnly, zValidator('param', uid), zValidator('json', z.object({ role: z.enum(['admin', 'editor']).optional(), active: z.boolean().optional() })), async (c) => {
  const { id: userId } = c.req.valid('param')
  const body = c.req.valid('json')
  if (body.role) await setRole(db, userId, body.role, c.get('actor'))
  if (body.active !== undefined) await setActive(db, userId, body.active, c.get('actor'))
  return c.json({ ok: true })
})
app.put('/users/:id/studios', adminOnly, zValidator('param', uid), zValidator('json', z.object({ studioIds: z.array(z.number().int().positive()).max(20) })), async (c) =>
  c.json(await setOwnerStudios(db, c.req.valid('param').id, c.req.valid('json').studioIds, c.get('actor'))),
)
app.delete('/users/:id/sessions/:sid', adminOnly, zValidator('param', z.object({ id: z.string().min(1).max(100), sid: z.string().min(1).max(100) })), async (c) => {
  const { id: userId, sid } = c.req.valid('param')
  return c.json(await revokeSession(db, userId, sid, c.get('actor')))
})
app.delete('/users/:id/sessions', adminOnly, zValidator('param', uid), async (c) => c.json(await revokeAllSessions(db, c.req.valid('param').id, c.get('actor'))))

export const panelApi = app
export type PanelApi = typeof app
