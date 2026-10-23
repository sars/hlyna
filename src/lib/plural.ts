// Ukrainian plural: pluralUk(5, ['місце', 'місця', 'місць']) → 'місць'. Client-safe (no data imports); src/lib/catalog.ts re-exports it.
export function pluralUk(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10,
    m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
