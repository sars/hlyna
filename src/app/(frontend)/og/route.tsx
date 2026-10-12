import type React from 'react'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Share card for any page, 1200×630, composition C2 «Етикетка» (docs/design/SYSTEM.md §7): a photo fills the card,
// a paper label with a cobalt bar carries the text, a paper tab with the mark and ГЛИНА hangs from the top edge.
// studio=1: no photo; an ink field with the studio's name as the subject. No years, no counts or prices: the card
// stays true for as long as the page lives. big=1 only renders the static home card:
//   curl 'http://localhost:3000/og?title=…&kicker=…&sub=…&img=og-331-wide-1&big=1' -o public/og-home.png
export const runtime = 'nodejs'

const dir = path.join(process.cwd(), 'src/assets/fonts')
const font = (name: string, family: string, weight: 400 | 800) =>
  readFile(path.join(dir, name)).then((data) => ({ name: family, data, weight, style: 'normal' as const }))
const fonts = Promise.all([
  font('Unbounded-ExtraBold.ttf', 'Unbounded', 800),
  font('GolosText-Regular.ttf', 'Golos Text', 400),
  font('JetBrainsMono-Regular.ttf', 'JetBrains Mono', 400),
])
const DISPLAY = 'Unbounded' // static TTF from github.com/googlefonts/unbounded: overlaps already removed (Satori fills overlapping contours with holes)
const BODY = 'Golos Text'
const MONO = 'JetBrains Mono'

const C = { paper: '#efe9de', ink: '#15130f', ink2: '#4e483f', cobalt: '#1d3ec6', mark: '#b4532e', clayText: '#a84a27', peach: '#ffd9a8', hair: 'rgba(21,19,15,.2)' }
const DEFAULT_PHOTO = 'og-331-wide-1'

// SYSTEM.md §7.4: a card never shows a year. The year goes with the words that lead into it («сезон 2026/27», «в 2026 році»).
const noYears = (s: string) =>
  s
    .replace(/\s*[·—–-]?\s*(?:(?:у|в|на|сезон)\s+)?\b(?:19|20)\d{2}(?:\/\d{2})?\b(?:\s+(?:року|році|рік|р\.))?/giu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[:,·—–-]\s*$/, '')
    .trim()

const param = (u: URL, k: string, max: number) => noYears((u.searchParams.get(k) || '').slice(0, max))

// img=<name> → public/images/site/<name>.jpg; doc-<name> → public/images/doc; stock-<name> → public/images/stock.
async function photo(img: string) {
  const [dirName, file] = img.startsWith('doc-') ? ['doc', img.slice(4)] : img.startsWith('stock-') ? ['stock', img.slice(6)] : ['site', img]
  const buf = await readFile(path.join(process.cwd(), 'public/images', dirName, `${file}.jpg`)).catch(() => null)
  return buf ? `data:image/jpeg;base64,${buf.toString('base64')}` : null
}

function Mark({ size, fill }: { size: number; fill: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill={fill}>
      <path fillRule="evenodd" d="M32 17 A21 21 0 1 1 31.99 17 Z M32 27.2 A10.8 10.8 0 1 0 32.01 27.2 Z" />
      <path d="M23.3 4 H40.7 L35.7 18 H28.3 Z" />
      <rect x="23.5" y="59" width="17" height="3.6" />
    </svg>
  )
}

const mono = (size: number, spacing: number, color: string): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, letterSpacing: spacing, color })
const display = (size: number, color: string, spacing = 0): React.CSSProperties => ({ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: spacing, color, textTransform: 'uppercase' })

// 48px up to 28 characters, 42px up to 44, then 36px.
const titleSize = (t: string) => (t.length <= 28 ? 48 : t.length <= 44 ? 42 : 36)

// Largest size at which the name fits in two lines (about 0.85em per capital letter, 1088px of room) and its
// longest word fits on a line; a longer word is broken anywhere at the smallest size.
function nameSize(name: string) {
  const word = Math.max(...name.split(/\s+/).map((w) => w.length))
  for (const s of [120, 92, 68, 56, 46]) if (Math.ceil((name.length * 0.85 * s) / 1088) <= 2 && word * 0.85 * s <= 1088) return s
  return 40
}

const Label = ({ width, children }: { width: number; children: React.ReactNode }) => (
  <div style={{ position: 'absolute', left: 48, bottom: 48, width, display: 'flex', flexDirection: 'column', background: C.paper, borderLeft: `12px solid ${C.cobalt}`, padding: '32px 40px 28px' }}>{children}</div>
)

const Foot = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.hair}`, ...mono(15, 0.9, C.ink2) }}>{children}</div>
)

export async function GET(req: Request) {
  const u = new URL(req.url)
  const title = param(u, 'title', 90) || 'Українська кераміка ручної роботи'
  const kicker = param(u, 'kicker', 60)
  const sub = param(u, 'sub', 140)
  const studio = u.searchParams.get('studio') === '1'
  const big = u.searchParams.get('big') === '1'
  const makes = (u.searchParams.get('makes') || '').split('|').map((m) => noYears(m.slice(0, 24))).filter(Boolean).slice(0, 4)
  // Only CC BY and CC BY-SA photos carry a credit; the archive and CC0 photos do not.
  const credit = (u.searchParams.get('credit') || '').slice(0, 80)
  const img = (u.searchParams.get('img') || DEFAULT_PHOTO).replace(/[^a-z0-9-]/g, '')
  const src = studio ? null : (await photo(img)) ?? (await photo(DEFAULT_PHOTO))
  const left = img.includes('wide') // wide crops keep the subject on the left, under the label's reach
  const tab = big ? { pad: '18px 26px 20px', mark: 56, gap: 16, text: 44 } : { pad: '12px 18px 14px', mark: 30, gap: 10, text: 22 }

  const body = studio ? (
    <>
      <div style={{ position: 'absolute', left: 56, top: 56, width: 1088, display: 'flex', flexDirection: 'column' }}>
        {kicker && <div style={{ ...mono(17, 1.36, C.peach), textTransform: 'uppercase', marginBottom: 16 }}>{kicker}</div>}
        <div style={{ ...display(nameSize(title), C.paper), lineHeight: 0.96, wordBreak: nameSize(title) === 40 ? 'break-all' : 'normal' }}>{title}</div>
      </div>
      <Label width={840}>
        {sub && <div style={{ fontFamily: BODY, fontSize: 21, lineHeight: 1.3, color: C.ink2 }}>{sub}</div>}
        {makes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 12 }}>
            {makes.map((m, i) => (
              <div key={m} style={{ ...mono(14, 0.56, C.ink2), textTransform: 'uppercase', paddingRight: 14, marginRight: 14, borderRight: i < makes.length - 1 ? '1px solid rgba(21,19,15,.25)' : 'none' }}>
                {m}
              </div>
            ))}
          </div>
        )}
        <Foot>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Mark size={22} fill={C.mark} />
            <div style={{ ...display(16, C.ink, 0.32), marginLeft: 8 }}>Глина</div>
            <div style={{ ...mono(14, 0.84, C.ink2), marginLeft: 14 }}>hlyna.com.ua</div>
          </div>
          <div>Профіль у каталозі студій</div>
        </Foot>
      </Label>
    </>
  ) : (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src!} alt="" width={1200} height={630} style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, objectFit: 'cover', objectPosition: left ? '0% 50%' : '50% 50%' }} />
      <div style={{ position: 'absolute', left: 48, top: 0, display: 'flex', alignItems: 'center', background: C.paper, padding: tab.pad }}>
        <Mark size={tab.mark} fill={C.mark} />
        <div style={{ ...display(tab.text, C.ink, tab.text * 0.02), marginLeft: tab.gap }}>Глина</div>
      </div>
      <Label width={760}>
        {kicker && <div style={{ ...mono(17, 1.36, C.clayText), textTransform: 'uppercase' }}>{kicker}</div>}
        <div style={{ ...display(big ? 42 : titleSize(title), C.ink), lineHeight: 1.04, marginTop: 12 }}>{title}</div>
        {sub && <div style={{ fontFamily: BODY, fontSize: 21, lineHeight: 1.3, color: C.ink2, marginTop: 14 }}>{sub}</div>}
        <Foot>
          <div>hlyna.com.ua</div>
          <div>Каталог студій і майстрів</div>
        </Foot>
      </Label>
      {credit && <div style={{ position: 'absolute', right: 48, bottom: 48, display: 'flex', background: C.paper, padding: '4px 10px', ...mono(13, 0.4, C.ink2) }}>{credit}</div>}
    </>
  )

  const png = await new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.ink, color: C.ink }}>{body}</div>, {
    width: 1200,
    height: 630,
    fonts: await fonts,
  }).arrayBuffer()
  // Satori only writes PNG, which is 700+ KB with a photo underneath; messengers take JPEG at about a seventh of that.
  // big=1 (the static home card, rendered once) stays PNG, palette-reduced.
  const out = big ? await sharp(Buffer.from(png)).png({ palette: true, quality: 85, effort: 10 }).toBuffer() : await sharp(Buffer.from(png)).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
  return new Response(new Uint8Array(out), { headers: { 'Content-Type': big ? 'image/png' : 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } })
}
