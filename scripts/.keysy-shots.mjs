import { chromium } from '@playwright/test'
const b = await chromium.launch()
for (const [n, vp] of [['d', { width: 1280, height: 900 }], ['m', { width: 390, height: 844 }]]) {
  const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 1 })).newPage()
  for (const u of ['/keysy', '/keysy/sholomitska-alex-cooper-tatar-bunar-london']) {
    await p.goto('http://localhost:3200' + u, { waitUntil: 'networkidle', timeout: 180000 })
    await p.screenshot({ path: `.shots/keysy/${u.split('/').pop()}-${n}.png`, fullPage: true })
  }
}
await b.close()
