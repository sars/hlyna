import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Password hashes are `scrypt$<salt b64>$<key b64>` (Node scrypt, N=16384, r=8, p=1, 64-byte key) — the format
// /kabinet has used since day one, so owners keep their passwords when they move to Better Auth.
// Better Auth is told to use these two functions instead of its own hasher.

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export function verifyPassword(password: string, stored?: string | null): boolean {
  if (!stored?.startsWith('scrypt$')) return false
  const [, saltB64, keyB64] = stored.split('$')
  if (!saltB64 || !keyB64) return false
  const key = Buffer.from(keyB64, 'base64')
  if (!key.length) return false
  const test = scryptSync(password, Buffer.from(saltB64, 'base64'), key.length)
  return timingSafeEqual(key, test)
}

export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 128
