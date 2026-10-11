// @vitest-environment node
// Fixes from the 2026-10-12 panel review: the approval link stays reachable, approvals and accepted owner changes
// refresh the public pages, forwarding to studios forwards the request, the journal speaks in names.
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const revalidated: string[][] = []
// revalidateCatalog imports next/cache lazily; catching revalidatePath shows which public pages a write refreshes.
vi.mock('next/cache', () => ({
  revalidateTag: () => undefined,
  revalidatePath: (p: string) => {
    revalidated.push([p])
  },
}))

import * as schema from '../../src/server/db/schema'
import { cities, studios } from '../../src/server/db/schema/catalog'
import { changeSets } from '../../src/server/db/schema/history'
import { claims, claimStudios, requests } from '../../src/server/db/schema/requests'
import { createUser } from '../../src/server/auth/users'
import type { Db } from '../../src/server/db'
import { applyChangeSet } from '../../src/server/services/changeSets'
import { approveClaim, claimInvite, reissueClaimInvite } from '../../src/server/services/claims'
import { journal } from '../../src/server/services/overview'
import { getRequest, setRequestStudios } from '../../src/server/services/requests'

const url = process.env.PANEL_TEST_DATABASE_URL ?? 'postgres://localhost/hlyna_apptest'
const pool = new Pool({ connectionString: url, max: 4 })
const db = drizzle(pool, { schema, casing: 'snake_case' }) as unknown as Db
const panel = { id: null, source: 'panel' as const }

let cityId: number
let studioA: number

beforeEach(async () => {
  revalidated.length = 0
  await db.execute(sql`truncate app.audit_log, app.change_sets, app.studio_revisions, app.request_studios, app.requests, app.claim_studios, app.claims, app.invite_links, app.studio_owner, app.session, app.account, app."user", app.studio_prices, app.studio_photos, app.studios, app.cities restart identity cascade`)
  ;[{ id: cityId }] = await db.insert(cities).values({ slug: 'kyiv', name: 'Київ' }).returning({ id: cities.id })
  ;[{ id: studioA }] = await db.insert(studios).values({ slug: 'yar', name: 'Яр', cityId, visibility: 'public' }).returning({ id: studios.id })
})

afterAll(async () => {
  await pool.end()
})

async function newClaim() {
  const [{ id }] = await db.insert(claims).values({ name: 'Оля', contact: '@olya' }).returning({ id: claims.id })
  await db.insert(claimStudios).values({ claimId: id, studioId: studioA, isMain: true, position: 0 })
  return id
}

describe('claim approval', () => {
  it('keeps the password link visible after approval and can issue a new one', async () => {
    const id = await newClaim()
    const res = await approveClaim(db, id, panel)
    expect(res.status).toBe('approved')
    const link = res.status === 'approved' ? res.link : null
    expect(link).toMatch(/\/kabinet\/parol\?token=/)
    const shown = await claimInvite(db, id)
    expect(shown?.link).toBe(link)
    expect(shown?.message).toContain(link!)
    const again = await reissueClaimInvite(db, id, panel)
    expect(again.link).not.toBe(link)
    expect((await claimInvite(db, id))?.link).toBe(again.link)
  })

  it('refreshes the studio pages once, not on a repeated approval', async () => {
    const id = await newClaim()
    await approveClaim(db, id, panel)
    expect(revalidated.flat()).toEqual(expect.arrayContaining(['/vyrobnyky/yar', '/vyrobnyky/misto/kyiv', '/maister-klasy/kyiv']))
    revalidated.length = 0
    await approveClaim(db, id, panel)
    expect(revalidated).toHaveLength(0)
  })
})

describe('owner changes', () => {
  it('accepting fields refreshes the studio pages', async () => {
    const owner = await createUser(db, { role: 'owner', name: 'Оля' })
    const [{ id }] = await db
      .insert(changeSets)
      .values({ studioId: studioA, authorId: owner, proposed: { recentNote: 'Новий МК у листопаді' }, status: 'pending' })
      .returning({ id: changeSets.id })
    const res = await applyChangeSet(db, id, 'all', panel)
    expect(res.status).toBe('applied')
    expect(revalidated.flat()).toContain('/vyrobnyky/yar')
  })
})

describe('requests and journal', () => {
  it('choosing studios for a new request forwards it, and the journal names the studios', async () => {
    const [{ id }] = await db.insert(requests).values({ what: 'tableware', contactName: 'Кав’ярня' }).returning({ id: requests.id })
    const res = await setRequestStudios(db, id, [studioA], panel)
    expect(res.status).toBe('forwarded')
    expect((await getRequest(db, id))!.status).toBe('forwarded')
    const { rows } = await journal(db, { entity: 'request', entityId: String(id) })
    const studiosRow = rows.find((r) => r.action === 'studios')!
    expect((studiosRow.changes as Record<string, { to: unknown }>).studios.to).toEqual(['Яр'])
    expect(studiosRow.entityLabel).toBe('Кав’ярня')
  })
})
