// A login is an email (lower-cased) or a Ukrainian/international phone number (digits, 380… form).
// It is stored as Better Auth's `username`; owners who log in with a phone get a synthetic
// email `owner-<id>@owners.hlyna.invalid` because Better Auth requires one (.invalid never resolves).

export function normalizeLogin(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s
  let d = s.replace(/[^\d]/g, '')
  if (d.length === 10 && d.startsWith('0')) d = `38${d}`
  if (d.length === 12 && d.startsWith('380')) return d
  if (d.length >= 10 && d.length <= 15 && /^\+?\d/.test(s)) return d
  return null
}

export const isEmailLogin = (login: string) => login.includes('@')

export const SYNTHETIC_EMAIL_DOMAIN = 'owners.hlyna.invalid'
export const syntheticEmail = (userId: string) => `${userId}@${SYNTHETIC_EMAIL_DOMAIN}`
export const isSyntheticEmail = (email: string) => email.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`)
