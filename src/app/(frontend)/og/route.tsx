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
  const [unbounded, raleway] = await fonts
  const band = Array.from({ length: 30 }, (_, i) => [C.terra, C.cobalt, C.ochre][i % 3])
  const size = (img ? 0.82 : 1) * (title.length > 60 ? 50 : title.length > 36 ? 60 : 72)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.clay, fontFamily: 'Raleway' }}>
        <div style={{ display: 'flex', height: 18 }}>
          {band.map((c, i) => (
            <div key={i} style={{ width: 34, height: 18, marginRight: 6, background: c }} />
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: photo ? '52px 48px 44px 64px' : '56px 72px 48px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {kicker && <div style={{ fontFamily: 'Unbounded', fontSize: 22, letterSpacing: 3, color: C.terra, textTransform: 'uppercase' }}>{kicker}</div>}
            <div style={{ fontFamily: 'Unbounded', fontSize: size, lineHeight: 1.05, color: C.ink, textTransform: 'uppercase' }}>{title}</div>
            {sub && <div style={{ fontSize: 30, lineHeight: 1.35, color: C.umber, maxWidth: 1000 }}>{sub}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: 34, color: C.cobalt }}>
              глина<span style={{ color: C.terra }}>.</span>юа
            </div>
            {!photo && <div style={{ display: 'flex', fontSize: 24, color: C.umber }}>українська кераміка ручної роботи</div>}
          </div>
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={440} height={612} alt="" style={{ width: 440, height: 612, objectFit: 'cover', borderTopLeftRadius: 40 }} />
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
