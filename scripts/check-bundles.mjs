// After `next build`: fail if any public page's client JavaScript contains panel or API code.
// Reads the build's per-route client manifests and greps the referenced chunks for panel-only modules.
//   node scripts/check-bundles.mjs            (run after pnpm build)
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const NEXT = path.resolve('.next')
const FORBIDDEN = [/components[\\/]panel[\\/]/, /@base-ui[\\/]react/, /@tanstack[\\/]react-query/, /@tanstack[\\/]react-virtual/, /better-auth[\\/](react|client)/, /node_modules[\\/]sonner[\\/]/, /node_modules[\\/]hono[\\/]/]
const PANEL_BUDGET = 200 * 1024 // kit DESIGN.md: first render of the panel ≤ 200 KB (gzip is checked loosely below)

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('_client-reference-manifest.js')) out.push(p)
  }
  return out
}

const manifests = walk(path.join(NEXT, 'server', 'app'))
if (!manifests.length) {
  console.error('No client reference manifests found — run `pnpm build` first.')
  process.exit(2)
}

let bad = 0
const chunkText = new Map()
const read = (rel) => {
  if (!chunkText.has(rel)) {
    const p = path.join(NEXT, rel.replace(/^\/?_next\//, ''))
    chunkText.set(rel, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '')
  }
  return chunkText.get(rel)
}

for (const m of manifests) {
  const route = path.relative(path.join(NEXT, 'server', 'app'), m).replace('_client-reference-manifest.js', '')
  const isPanel = route.startsWith('panel') || route.startsWith('(panel)')
  const isPayload = route.startsWith('(payload)') || route.startsWith('admin') || route.startsWith('api')
  if (isPayload) continue
  const src = fs.readFileSync(m, 'utf8')
  // The manifest lists every client module the route renders, keyed by its source path.
  const modules = [...src.matchAll(/"([^"]+\.(?:tsx|ts|jsx|js|mjs))"/g)].map((x) => x[1])
  if (isPanel) {
    // Panel budget (kit DESIGN.md): the client JS a panel screen loads, gzip, ≤ 200 KB. Lazy chunks (MapLibre) are
    // not in the manifest, so this measures what the first render needs.
    const chunks = [...new Set([...src.matchAll(/static\/chunks\/[^"]+\.js/g)].map((x) => x[0]))]
    const gz = chunks.reduce((n, c) => n + zlib.gzipSync(Buffer.from(read(`/_next/${c}`))).length, 0)
    if (gz > PANEL_BUDGET) {
      bad++
      console.error(`✗ ${route}: panel client JS ${Math.round(gz / 1024)} KB gzip > ${PANEL_BUDGET / 1024} KB budget`)
    }
  }
  if (!isPanel) {
    const hits = modules.filter((mod) => FORBIDDEN.some((re) => re.test(mod)))
    if (hits.length) {
      bad++
      console.error(`✗ ${route}: public page references panel/API client modules:\n  ${[...new Set(hits)].slice(0, 8).join('\n  ')}`)
    }
  }
}

if (bad) process.exit(1)
console.log(`✓ ${manifests.length} route manifests checked: no panel or API client code on public pages.`)
