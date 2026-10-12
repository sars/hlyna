// Panel smoke: set password from an invite → sign in → overview, requests (filter, detail, status, notes),
// claims, changes, journal; desktop 1280 and phone 390. Screenshots in .shots/panel/.
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const INVITE = process.env.INVITE
const EMAIL = process.env.EMAIL
const PASSWORD = 'test-only-password-123'
const out = (n) => `.shots/panel/${n}.png`
const errors = []

const b = await chromium.launch()
async function run(name, viewport, first) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500, locale: 'uk-UA' })
  // the Next dev overlay badge sits over the tab bar and swallows clicks in dev runs
  await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = 'nextjs-portal{display:none!important}'; document.head.appendChild(st) }))
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name} console: ${m.text().slice(0, 200)}`))
  const shot = async (n) => p.screenshot({ path: out(`${name}-${n}`), fullPage: true })

  if (first) {
    await p.goto(INVITE, { waitUntil: 'networkidle' })
    await shot('00-set-password')
    await p.fill('#login', EMAIL)
    await p.fill('#password', PASSWORD)
    await p.click('button[type=submit]')
    await p.waitForURL(`${BASE}/panel`, { timeout: 30000 })
    await p.goto(`${BASE}/panel/vhid`)
    await p.waitForURL(`${BASE}/panel`) // signed-in staff are sent on
    await p.locator('aside button').first().click() // the user menu (name of the signed-in person)
    await p.click('role=menuitem[name="Вийти"]')
    await p.waitForURL(`${BASE}/panel/vhid`)
  } else {
    await p.goto(`${BASE}/panel`)
    await p.waitForURL(/\/panel\/vhid/)
  }
  await shot('01-sign-in')
  await p.fill('#password', 'wrong-password')
  await p.fill('#email', EMAIL)
  await p.click('button[type=submit]')
  await p.waitForSelector('text=Невірний email або пароль')
  await p.fill('#password', PASSWORD)
  await p.click('button[type=submit]')
  await p.waitForURL(`${BASE}/panel`)
  await p.waitForLoadState('networkidle')
  await shot('02-overview')

  await p.click(viewport.width < 768 ? 'nav[aria-label="Розділи панелі"] >> nth=-1 >> text=Запити' : 'aside >> text=Запити')
  await p.waitForURL(`${BASE}/panel/zapyty`)
  await shot('03-requests')
  await p.locator('a[href^="/panel/zapyty/"]').first().click()
  await p.waitForURL(/\/panel\/zapyty\/\d+/)
  await p.click('role=radio[name="В роботі"]')
  await p.waitForSelector('text=Статус: В роботі')
  await p.fill('#notes', `смок-тест ${name}`)
  await p.click('form >> button[type=submit]')
  await p.waitForSelector('text=Збережено')
  await p.waitForLoadState('networkidle')
  await shot('04-request-detail')

  await p.goto(`${BASE}/panel/zayavky`)
  await shot('05-claims')
  await p.locator('a[href^="/panel/zayavky/"]').first().click()
  await p.waitForURL(/\/panel\/zayavky\/\d+/)
  await shot('06-claim-detail')
  await p.goto(`${BASE}/panel/zminy`)
  await shot('07-changes')
  await p.goto(`${BASE}/panel/zhurnal`)
  await shot('08-journal')
  await ctx.close()
}

try {
  await run('desktop', { width: 1280, height: 860 }, true)
  // Sign-in is rate-limited to 3 attempts per 10 s per IP: let the desktop attempts expire first.
  await new Promise((r) => setTimeout(r, 11_000))
  await run('phone', { width: 390, height: 844 }, false)
} catch (e) {
  errors.push(`FAILED: ${e.message}`)
}
await b.close()
console.log(errors.length ? errors.join('\n') : 'smoke ok')
process.exit(errors.some((e) => e.startsWith('FAILED')) ? 1 : 0)
