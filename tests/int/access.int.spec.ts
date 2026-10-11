// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Kabinet edits: the route must refuse before reading any input when the owner doesn't own the studio.
const kab = vi.hoisted(() => ({ owner: null as null | { id: number }, owned: null as null | { id: number; slug: string } }))
vi.mock('@/lib/kabinet', () => ({
  MAX_PHOTOS: 10,
  currentOwner: async () => kab.owner,
  ownedStudio: async () => kab.owned,
  payloadClient: async () => {
    throw new Error('must not be reached')
  },
}))
vi.mock('@/lib/telegram', () => ({ notifyOwnerTelegram: async () => undefined, ownerEditKeyboard: () => undefined }))

const post = async () => {
  const { POST } = await import('@/app/(frontend)/kabinet/api/studio/[slug]/route')
  const body = new FormData()
  body.set('data', '{}')
  return POST(new Request('http://localhost/kabinet/api/studio/x', { method: 'POST', body }), { params: Promise.resolve({ slug: 'chuzha-studiia' }) })
}

describe('kabinet access', () => {
  beforeEach(() => {
    kab.owner = null
    kab.owned = null
  })
  it('401 without a session', async () => {
    expect((await post()).status).toBe(401)
  })
  it('403 for a studio the owner does not own', async () => {
    kab.owner = { id: 7 }
    expect((await post()).status).toBe(403)
  })
})

describe('public request create response', () => {
  it('anonymous create answers with the id only', async () => {
    const { publicCreateResponse } = await import('@/collections/Requests')
    const full = { id: 12, status: 'new', commission5: 50, notes: 'internal', studiosSent: [1] }
    const out = await publicCreateResponse({ operation: 'create', req: { user: null }, result: full } as never)
    expect(out).toEqual({ id: 12 })
  })
  it('logged-in users and other operations get the full result', async () => {
    const { publicCreateResponse } = await import('@/collections/Requests')
    const full = { id: 12, status: 'new', notes: 'internal' }
    expect(await publicCreateResponse({ operation: 'create', req: { user: { id: 1 } }, result: full } as never)).toEqual(full)
    expect(await publicCreateResponse({ operation: 'update', req: { user: null }, result: full } as never)).toEqual(full)
  })
})
