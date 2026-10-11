import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Studio owners sign in to /kabinet with their own small session, separate from Payload auth:
// they never become a Payload `req.user`, so no admin collection or REST endpoint ever trusts them.
// Their edits go through /kabinet routes that check ownership and allow only a fixed set of fields.

export const OWNER_COOKIE = 'hlyna_owner'
const SESSION_DAYS = 30

const secret = () => {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is not set')
  return s
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored?.startsWith('scrypt$')) return false
  const [, saltB64, keyB64] = stored.split('$')
  const key = Buffer.from(keyB64, 'base64')
  const test = scryptSync(password, Buffer.from(saltB64, 'base64'), key.length)
  return timingSafeEqual(key, test)
}

/** Random token for the one-time set-password link; only its hash is stored. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function sessionValue(ownerId: number, passwordHash: string): { value: string; maxAge: number } {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
  // The password fingerprint ends all sessions when the password changes.
  const pw = createHash('sha256').update(passwordHash).digest('base64url').slice(0, 12)
  const payload = `${ownerId}.${exp}.${pw}`
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_DAYS * 86400 }
}

export function readSession(value?: string | null): { ownerId: number; pw: string } | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const [id, exp, pw, sig] = parts
  const expected = sign(`${id}.${exp}.${pw}`)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  if (Number(exp) < Date.now() / 1000) return null
  return { ownerId: Number(id), pw }
}

export const passwordFingerprint = (passwordHash: string) =>
  createHash('sha256').update(passwordHash).digest('base64url').slice(0, 12)

/** Login is an email (lower-cased) or a phone (digits, 380… form). Returns null if it is neither. */
export function normalizeLogin(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s
  let d = s.replace(/[^\d]/g, '')
  if (d.length === 10 && d.startsWith('0')) d = `38${d}`
  if (d.length === 12 && d.startsWith('380')) return d
  if (d.length >= 10 && d.length <= 15 && /^\+?\d/.test(s)) return d
  return null
}

// Small in-memory rate limiter (one app instance). Enough to slow down guessing and spam.
const buckets = new Map<string, number[]>()
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) for (const k of [...buckets.keys()].slice(0, 1000)) buckets.delete(k)
  return hits.length > max
}

export const clientIp = (headers: Headers) =>
  (headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'local').split(',')[0].trim()
