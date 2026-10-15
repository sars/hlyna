import linked from '@/content/linked.json'

// «Також» on profiles: separate public names with separate work that belong together, a maker and her studio, a brand and
// its tile line (owner, 15–16.10.2026: link them and count them once; the same place is merged instead, scripts/app/edits).
// Each entry in src/content/linked.json: slugs [a, b]; labels [what b is, shown on a's profile; what a is, shown on b's];
// why: the source. A link to a profile that is not published is not shown.
type Link = { slugs: string[]; labels: string[]; why: string }
const LINKS = linked as Link[]

/** The profiles linked to this one, with what each of them is to it. */
export function alsoFor(slug: string): { slug: string; label: string }[] {
  return LINKS.flatMap((l) => (l.slugs[0] === slug ? [{ slug: l.slugs[1], label: l.labels[0] }] : l.slugs[1] === slug ? [{ slug: l.slugs[0], label: l.labels[1] }] : []))
}

/** How many places a list holds when linked profiles count once (a maker and her studio are one place in a count). */
export function countPlaces(xs: { slug?: string | null }[]): number {
  const parent = new Map(xs.filter((x) => x.slug).map((x) => [x.slug!, x.slug!]))
  const root = (s: string): string => {
    const p = parent.get(s)!
    return p === s ? s : root(p)
  }
  for (const l of LINKS) if (parent.has(l.slugs[0]) && parent.has(l.slugs[1])) parent.set(root(l.slugs[0]), root(l.slugs[1]))
  return new Set([...parent.keys()].map(root)).size + xs.filter((x) => !x.slug).length
}
