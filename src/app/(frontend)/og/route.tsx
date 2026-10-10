import type React from 'react'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Share card for any page: /og?title=…&kicker=…&sub=…  (1200×630, design 1A).
// Used in each page's Open Graph metadata; messengers and search show it when a link is shared.
export const runtime = 'nodejs'

const fonts = Promise.all([
  readFile(path.join(process.cwd(), 'src/assets/fonts/Unbounded-Bold.ttf')),
  readFile(path.join(process.cwd(), 'src/assets/fonts/Raleway-Medium.ttf')),
])

const C = { clay: '#f3e7da', card: '#fbf3ea', ink: '#2a2018', umber: '#6c5243', terra: '#b4683f', cobalt: '#2a4fa8', ochre: '#d9a441' }

export async function GET(req: Request) {
  const u = new URL(req.url)
  const title = (u.searchParams.get('title') || 'Українська кераміка ручної роботи').slice(0, 90)
  const kicker = (u.searchParams.get('kicker') || '').slice(0, 60)
  const sub = (u.searchParams.get('sub') || '').slice(0, 140)
  const img = (u.searchParams.get('img') || '').replace(/[^a-z0-9-]/g, '')
  const photo = img ? `data:image/jpeg;base64,${(await readFile(path.join(process.cwd(), 'public/images/stock', `${img}.jpg`)).catch(() => Buffer.from(''))).toString('base64')}` : ''
  const seed = (u.searchParams.get('pattern') || '').slice(0, 40)
  // City coat of arms (public/images/coa/<slug>.png, from Wikimedia Commons); falls back to the mosaic.
  const coaSlug = (u.searchParams.get('coa') || '').replace(/[^a-z0-9-]/g, '')
  const coaBuf = coaSlug ? await readFile(path.join(process.cwd(), 'public/images/coa', `${coaSlug}.png`)).catch(() => null) : null
  const coa = coaBuf && coaBuf.length > 10000 ? `data:image/png;base64,${coaBuf.toString('base64')}` : ''
  const [unbounded, raleway] = await fonts
  const band = Array.from({ length: 30 }, (_, i) => [C.terra, C.cobalt, C.ochre][i % 3])
  const size = (img || u.searchParams.get('pattern') || coaSlug ? 0.82 : 1) * (title.length > 60 ? 50 : title.length > 36 ? 60 : 72)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.clay, fontFamily: 'Raleway' }}>
        <div style={{ display: 'flex', height: 18 }}>
          {band.map((c, i) => (
            <div key={i} style={{ width: 34, height: 18, marginRight: 6, background: c }} />
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: photo || seed || coa ? '52px 48px 44px 64px' : '56px 72px 48px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {kicker && <div style={{ fontFamily: 'Unbounded', fontSize: 22, letterSpacing: 3, color: C.terra, textTransform: 'uppercase' }}>{kicker}</div>}
            <div style={{ fontFamily: 'Unbounded', fontSize: size, lineHeight: 1.05, color: C.ink, textTransform: 'uppercase' }}>{title}</div>
            {sub && <div style={{ fontSize: 30, lineHeight: 1.35, color: C.umber, maxWidth: 1000 }}>{sub}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: 34, color: C.cobalt }}>
              глина
            </div>
            <div style={{ display: 'flex', fontSize: 26, color: C.umber }}>hlyna.com.ua</div>
          </div>
        </div>
        {coa && !photo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 420, height: 548, margin: '32px 32px 32px 0', background: C.card, borderRadius: 36 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coa} alt="" style={{ maxWidth: 330, maxHeight: 440, objectFit: 'contain' }} />
          </div>
        )}
        {seed && !photo && !coa && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 420, height: 548, margin: '32px 32px 32px 0', background: C.card, borderRadius: 36 }}>
            <ShieldMosaic seed={seed} />
          </div>
        )}
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={420} height={548} alt="" style={{ width: 420, height: 548, objectFit: 'cover', borderRadius: 36, margin: '32px 32px 32px 0' }} />
        )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Unbounded', data: unbounded, weight: 700, style: 'normal' },
        { name: 'Raleway', data: raleway, weight: 500, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    },
  )
}

// Fallback "coat of arms": a heater shield filled with the city's own ceramic-tile mosaic.
function ShieldMosaic({ seed }: { seed: string }) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000
  const colors = [C.terra, C.cobalt, C.ochre, '#5f7e6a']
  const shield = 'M12 12 H318 V228 C318 318 250 382 165 412 C80 382 12 318 12 228 Z'
  const tiles: React.ReactNode[] = []
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 5; c++) {
      const x = 12 + c * 61.2, y = 12 + r * 61, fill = colors[Math.floor(rnd() * colors.length)], k = Math.floor(rnd() * 3)
      tiles.push(<rect key={`b${r}${c}`} x={x} y={y} width={61.2} height={61} fill="#f6ead9" stroke="#e1c7ae" strokeWidth={2} />)
      tiles.push(
        k === 0 ? <circle key={`s${r}${c}`} cx={x + 30.6} cy={y + 30.5} r={18} fill={fill} />
        : k === 1 ? <path key={`s${r}${c}`} d={`M${x + 12} ${y + 22} H${x + 49} A18.5 18.5 0 0 1 ${x + 12} ${y + 22} Z`} fill={fill} />
        : <rect key={`s${r}${c}`} x={x + 13} y={y + 13} width={35} height={35} rx={8} fill={fill} />,
      )
    }
  return (
    <svg width={330} height={424} viewBox="0 0 330 424">
      <defs>
        <clipPath id="shield"><path d={shield} /></clipPath>
      </defs>
      <g clipPath="url(#shield)">{tiles}</g>
      <path d={shield} fill="none" stroke={C.ochre} strokeWidth={10} />
    </svg>
  )
}
