// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'

import { hashPassword, hashToken, newToken, normalizeLogin, passwordFingerprint, rateLimited, readSession, sessionValue, verifyPassword } from '@/lib/ownerAuth'

beforeAll(() => {
  process.env.PAYLOAD_SECRET ||= 'test-secret'
})

describe('owner auth', () => {
  it('hashes and verifies passwords (scrypt), rejects wrong or foreign formats', () => {
    const h = hashPassword('глина-2026')
    expect(h.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('глина-2026', h)).toBe(true)
    expect(verifyPassword('інший', h)).toBe(false)
    expect(verifyPassword('глина-2026', 'bcrypt$whatever')).toBe(false)
    expect(verifyPassword('x', null)).toBe(false)
  })
  it('one-time tokens: only the hash is stored and it matches', () => {
    const { token, hash } = newToken()
    expect(token.length).toBeGreaterThan(20)
    expect(hashToken(token)).toBe(hash)
  })
  it('sessions: signed, tamper-proof, tied to the password, expiring', () => {
    const pw = hashPassword('a')
    const { value } = sessionValue(7, pw)
    expect(readSession(value)).toEqual({ ownerId: 7, pw: passwordFingerprint(pw) })
    const [id, exp, fp, sig] = value.split('.')
    expect(readSession(`8.${exp}.${fp}.${sig}`)).toBeNull()
    expect(readSession(`${id}.1.${fp}.${sig}`)).toBeNull()
    expect(readSession('garbage')).toBeNull()
    expect(passwordFingerprint(hashPassword('b'))).not.toBe(fp)
  })
  it('logins: e-mail lower-cased, Ukrainian phones normalised, junk rejected', () => {
    expect(normalizeLogin(' Studio@Example.COM ')).toBe('studio@example.com')
    expect(normalizeLogin('093 123 45 67')).toBe('380931234567')
    expect(normalizeLogin('+380 93 123 45 67')).toBe('380931234567')
    expect(normalizeLogin('hello')).toBeNull()
  })
  it('rate limiter blocks after the limit within the window', () => {
    const key = `test:${Math.random()}`
    const results = Array.from({ length: 6 }, () => rateLimited(key, 5, 60_000))
    expect(results).toEqual([false, false, false, false, false, true])
  })
})
