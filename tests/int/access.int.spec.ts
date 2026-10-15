import { beforeEach, describe, expect, it, vi } from 'vitest'

// Kabinet edits: no session → 401; a studio the owner doesn't own → 403 (from the service), before anything is saved;
// an unknown section, or «foto» on the section route → 404.
const st = vi.hoisted(() => ({ user: null as null | { id: string; role: string; name: string }, calls: 0 }))
class Forbidden extends Error {}
class Invalid extends Error {}
class FieldErrors extends Invalid {
  fields = { phone: 'Схоже, номер неповний.' }
}
vi.mock('@/server/auth/guards', () => ({ currentUser: async () => st.user }))
vi.mock('@/server/db', () => ({ db: {} }))
vi.mock('@/server/services/limits', () => ({ rateLimited: async () => false, clientIp: () => '127.0.0.1' }))
vi.mock('@/server/services/studioEditor', () => ({ Invalid }))
vi.mock('@/server/services/kabinet', () => ({
  Forbidden,
  FieldErrors,
  saveSection: async (_db: unknown, { data }: { data: { bad?: boolean } }) => {
    st.calls++
    if (data.bad) throw new FieldErrors('x')
    throw new Forbidden('Немає доступу до цієї студії.')
  },
}))
vi.mock('@/server/services/kabinetPhotos', () => ({
  addPhoto: async () => {
    st.calls++
    throw new Forbidden('Немає доступу до цієї студії.')
  },
  setPhotoOrder: async () => {
    st.calls++
    throw new Forbidden('Немає доступу до цієї студії.')
  },
  setPhotoCaption: async () => {
    st.calls++
    throw new Forbidden('Немає доступу до цієї студії.')
  },
}))

const post = async (section = 'kontakty', body: unknown = {}) => {
  const { POST } = await import('@/app/(kabinet)/kabinet/api/studio/[slug]/[section]/route')
  return POST(new Request('http://localhost/kabinet/api/studio/x/kontakty', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ slug: 'chuzha-studiia', section }) })
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
  it('400 with the field messages when validation fails', async () => {
    st.user = { id: 'o1', role: 'owner', name: 'Власниця' }
    const res = await post('kontakty', { bad: true })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ fields: { phone: expect.any(String) } })
  })
  it('404 for an unknown section and for «foto» (photos have their own routes)', async () => {
    st.user = { id: 'o1', role: 'owner', name: 'Власниця' }
    expect((await post('nope')).status).toBe(404)
    expect((await post('foto')).status).toBe(404)
    expect(st.calls).toBe(0)
  })
  it('photo routes: 401 without a session, 403 for a foreign studio', async () => {
    const { PUT } = await import('@/app/(kabinet)/kabinet/api/studio/[slug]/photos/route')
    const { PATCH } = await import('@/app/(kabinet)/kabinet/api/studio/[slug]/photos/[id]/route')
    const put = () => PUT(new Request('http://localhost/x', { method: 'PUT', body: JSON.stringify({ order: [1] }) }), { params: Promise.resolve({ slug: 'chuzha-studiia' }) })
    const patch = () => PATCH(new Request('http://localhost/x', { method: 'PATCH', body: JSON.stringify({ caption: 'a' }) }), { params: Promise.resolve({ slug: 'chuzha-studiia', id: '5' }) })
    expect((await put()).status).toBe(401)
    expect((await patch()).status).toBe(401)
    st.user = { id: 'o1', role: 'owner', name: 'Власниця' }
    expect((await put()).status).toBe(403)
    expect((await patch()).status).toBe(403)
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
