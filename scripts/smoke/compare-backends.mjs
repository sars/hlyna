// Same pages on both backends (3201 = Payload, 3200 = app): screenshots for a before/after comparison.
import { chromium } from '@playwright/test'
const slug = process.argv[2]
const pages = ['/kabinet/vhid', `/kabinet/zayavka?studio=${slug}`, '/zapyt', '/zapyt?vid=studiya', '/kabinet/parol?token=x']
const b = await chromium.launch()
for (const [port, tag] of [[Number(process.argv[3]), process.argv[4]]])
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    for (const path of pages) {
      await p.goto(`http://localhost:${port}${path}`, { waitUntil: 'networkidle' })
      await p.addStyleTag({ content: 'nextjs-portal,[data-nextjs-toast]{display:none!important}' })
      await p.screenshot({ path: `.shots/m3/cmp-${tag}-${vp.width}-${path.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true })
    }
    await ctx.close()
  }
await b.close()
