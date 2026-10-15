// Recent searches of this browser only (never sent anywhere). Storage can be missing or blocked: every call is guarded.
const KEY = 'hlyna:search:recent'
const MAX = 5

export function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function rememberSearch(q: string) {
  const t = q.trim().slice(0, 100)
  if (t.length < 2) return
  try {
    localStorage.setItem(KEY, JSON.stringify([t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX)))
  } catch {}
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}
