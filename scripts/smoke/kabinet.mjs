// Cabinet smoke: invite → set password → cabinet list → edit (text, price, photo)
// → saved as a change set; sign out, wrong password, sign in; claim form; request form. Desktop 1280 and phone 390.
// Screenshots in .shots/kabinet/. Also checks the database after each write.
import { chromium } from '@playwright/test'
import pg from 'pg'
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const INVITE = process.env.INVITE
const DB = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const PASSWORD = 'test-only-password-123'
const LOGIN = 'smoke-owner@example.invalid'
mkdirSync('.shots/kabinet', { recursive: true })
const errors = []
const q = async (sql, args = []) => (await DB.query(sql, args)).rows

const photo = '/tmp/m3-smoke-photo.jpg'
writeFileSync(photo, await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#b4683f' } }).jpeg().toBuffer())

const b = await chromium.launch()
async function page(viewport, tag) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 500, hasTouch: viewport.width < 500, locale: 'uk-UA' })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`))
  p.on('response', (r) => r.status() >= 400 && console.log(`${tag} ${r.status()} ${r.url().replace(BASE, '')}`))
  p.on('console', (m) => m.type() === 'error' && !/hydrat|Download the React DevTools|status of 401/i.test(m.text()) && errors.push(`${tag} console: ${m.text().slice(0, 200)}`))
  return p
}
const shot = (p, n) => p.screenshot({ path: `.shots/kabinet/${n}.png`, fullPage: true })

// 1. set password from the invite (desktop)
const d = await page({ width: 1280, height: 900 }, 'desktop')
await d.goto(INVITE, { waitUntil: 'networkidle' })
await shot(d, 'd-01-set-password')
await d.fill('input[name=login], #login', LOGIN)
await d.fill('input[name=password], #password', PASSWORD)
if (await d.locator('input[name=password2]').count()) await d.fill('input[name=password2]', PASSWORD)
await d.click('button[type=submit]')
await d.waitForURL(`${BASE}/kabinet`, { timeout: 30000 })
await shot(d, 'd-02-kabinet')
const studios = await d.locator('a:has-text("Редагувати")').count()
if (studios < 1) errors.push('kabinet shows no studios')

// 2. edit: «Що нового», a new price line, one photo with alt
await d.locator('a:has-text("Редагувати")').first().click()
await d.waitForLoadState('networkidle')
await shot(d, 'd-03-edit-before')
await d.fill('textarea[name=ownerNews]', 'Смоук: нова осіння серія чашок')
const priceInputs = d.locator('input[aria-label="Ціна"]')
if ((await priceInputs.count()) > 0) await priceInputs.last().fill('Смоук-МК, 2 год — 777 грн')
const file = d.locator('input[type=file]').first()
await file.setInputFiles(photo)
const alt = d.locator('input[aria-label="Що на фото"]').last()
if (await alt.count()) await alt.fill('Чашки на полиці')
await d.click('button[type=submit]:has-text("Зберегти"), button:has-text("Зберегти")')
await d.waitForSelector('text=Збережено. Ми переглянемо', { timeout: 30000 })
await shot(d, 'd-04-edit-saved')
const cs = await q(`select c.id, c.proposed->>'ownerNews' as news, cardinality(c.new_media_ids) as photos, (select count(*) from app.media m where m.status='pending') as pending from app.change_sets c where c.status='pending' order by c.id desc limit 1`)
if (!cs[0] || cs[0].news !== 'Смоук: нова осіння серія чашок') errors.push(`change set not saved: ${JSON.stringify(cs)}`)
if (!cs[0] || Number(cs[0].pending) < 1) errors.push(`no pending photo: ${JSON.stringify(cs)}`)

// 3. sign out, wrong password, sign in again
await d.goto(`${BASE}/kabinet`)
await d.click('button:has-text("Вийти")')
await d.waitForURL(`${BASE}/kabinet/vhid`)
await d.fill('input[name=login], #login', LOGIN)
await d.fill('input[name=password], #password', 'wrong-password-123')
await d.click('button[type=submit]')
await d.waitForSelector('text=/Неправильний логін або пароль|Забагато/', { timeout: 15000 })
await shot(d, 'd-05-wrong-password')
await d.fill('input[name=password], #password', PASSWORD)
await d.click('button[type=submit]')
await d.waitForURL(`${BASE}/kabinet`, { timeout: 30000 })

// 4. phone: cabinet and edit page
const m = await page({ width: 390, height: 844 }, 'phone')
await m.context().addCookies(await d.context().cookies())
await m.goto(`${BASE}/kabinet`, { waitUntil: 'networkidle' })
await shot(m, 'm-01-kabinet')
await m.locator('a:has-text("Редагувати")').first().click()
await m.waitForLoadState('networkidle')
await shot(m, 'm-02-edit')
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
if (overflow > 1) errors.push(`phone horizontal overflow ${overflow}px`)

// 5. claim form and request form (anonymous)
const a = await page({ width: 1280, height: 900 }, 'anon')
const [{ slug }] = await q(`select slug from app.studios where visibility='public' and not owner_verified order by id limit 1`)
await a.goto(`${BASE}/kabinet/zayavka?studio=${slug}`, { waitUntil: 'networkidle' })
await shot(a, 'a-01-claim')
await a.fill('input[name=name]', 'Смоук Тест')
await a.fill('input[name=contact]', '@smoke_test')
await a.check('input[name=represents]')
await a.click('button[type=submit]')
await a.waitForSelector('text=/Заявк|дякуємо|Дякуємо|отримали/', { timeout: 20000 })
await shot(a, 'a-02-claim-sent')
const claims = await q(`select c.id from app.claims c join app.claim_studios cs on cs.claim_id=c.id join app.studios s on s.id=cs.studio_id where s.slug=$1 and c.name='Смоук Тест'`, [slug])
if (!claims.length) errors.push('claim not saved')

await a.goto(`${BASE}/zapyt`, { waitUntil: 'networkidle' })
await a.fill('textarea[name=details], #details', 'Смоук: 20 чашок з логотипом')
await a.fill('input[name=contactPhoneOrTelegram], #contactPhoneOrTelegram', '@smoke_test')
await a.click('button[type=submit]')
await a.waitForSelector('text=/Запит надіслано/', { timeout: 20000 })
await shot(a, 'a-03-request-sent')
const reqs = await q(`select id from app.requests where details like 'Смоук:%'`)
if (!reqs.length) errors.push('request not saved')

await b.close()
await DB.end()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'kabinet smoke OK')
process.exit(errors.length ? 1 : 0)
