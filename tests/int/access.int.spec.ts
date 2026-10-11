// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Kabinet edits: no session → 401; a studio the owner doesn't own → 403 (from the service), before anything is saved.
const st = vi.hoisted(() => ({ user: null as null | { id: string; role: string; name: string }, calls: 0 }))
class Forbidden extends Error {}
class Invalid extends Error {}
vi.mock('@/server/auth/guards', () => ({ currentUser: async () => st.user }))
vi.mock('@/server/db', () => ({ db: {} }))
vi.mock('@/server/services/limits', () => ({ rateLimited: async () => false, clientIp: () => '127.0.0.1' }))
vi.mock('@/server/services/studioEditor', () => ({ Invalid }))
vi.mock('@/server/services/kabinet', () => ({
  Forbidden,
  submitOwnerEdit: async () => {
    st.calls++
    throw new Forbidden('Немає доступу до цієї студії.')
  },
}))

const post = async () => {
  const { POST } = await import('@/app/(frontend)/kabinet/api/studio/[slug]/route')
  const body = new FormData()
  body.set('data', '{}')
  return POST(new Request('http://localhost/kabinet/api/studio/x', { method: 'POST', body }), { params: Promise.resolve({ slug: 'chuzha-studiia' }) })
}

describe('kabinet access', () => {
  beforeEach(() => {
    st.user = null
    st.calls = 0
  })
  it('401 without a session, nothing submitted', async () => {
    expect((await post()).status).toBe(401)
    expect(st.calls).toBe(0)
  })
  it('401 for a signed-in non-owner (staff session is not a cabinet session)', async () => {
    st.user = { id: 'u1', role: 'editor', name: 'Редактор' }
    expect((await post()).status).toBe(401)
  })
  it('403 for a studio the owner does not own', async () => {
    st.user = { id: 'o1', role: 'owner', name: 'Власниця' }
    expect((await post()).status).toBe(403)
  })
})

vi.mock('@/server/services/publicForms', () => ({
  submitRequest: async () => ({ ok: true, id: 12 }),
}))

describe('public request create response', () => {
  it('answers with the id only (no internal fields)', async () => {
    const { POST } = await import('@/app/api/zapyt/route')
    const res = await POST(new Request('http://localhost/api/zapyt', { method: 'POST', body: JSON.stringify({ what: 'other' }) }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: 12, doc: { id: 12 } })
  })
})
