// Cabinet smoke (redesigned cabinet): invite → password → home → overview → save a text section → field errors
// → add a photo (JPEG) and see it on review → reorder → sign out and in → claim form. Desktop 1280 and phone 390.
// Screenshots in .shots/kabinet/. Also checks the database after each write.
//
//   DATABASE_URL=postgres://localhost:5432/hlyna_merge USER_ID=kabinet-test@example.invalid BASE=http://localhost:3000 \
//     pnpm exec tsx scripts/app/invite.ts                   → prints the invite link
//   INVITE=<link> DATABASE_URL=… node scripts/smoke/kabinet.mjs   (without INVITE it signs in as the test owner)
import { chromium } from '@playwright/test'
import pg from 'pg'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const INVITE = process.env.INVITE
const DB = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const PASSWORD = 'test-only-password-123'
const LOGIN = process.env.SMOKE_LOGIN ?? 'kabinet-test@example.invalid'
mkdirSync('.shots/kabinet', { recursive: true })
const errors = []
const NEWS = `Смоук: нова осіння серія чашок ${Date.now() % 100000}`
const q = async (sql, args = []) => (await DB.query(sql, args)).rows
const check = (ok, what) => ok || errors.push(what)
// A fresh start: open reviews the test owner left in earlier runs are closed, so photo limits and states start clean.
await q(
  `update app.change_sets c set status = 'rejected', decision_note = 'smoke reset', decided_at = now()
     from app.studio_owner so join app."user" u on u.id = so.user_id
    where c.studio_id = so.studio_id and u.email = $1 and c.status = 'pending'`,
  [LOGIN],
)

const dir = join(tmpdir(), 'hlyna-kabinet-smoke')
mkdirSync(dir, { recursive: true })
const photoA = join(dir, 'smoke-a.jpg')
const photoB = join(dir, 'smoke-b.jpg')
// Different colours every run: the server keeps one copy of a picture it has seen.
const hue = () => ({ r: Math.floor(Math.random() * 255), g: Math.floor(Math.random() * 255), b: Math.floor(Math.random() * 255) })
writeFileSync(photoA, await sharp({ create: { width: 3200, height: 2400, channels: 3, background: hue() } }).jpeg().toBuffer())
writeFileSync(photoB, await sharp({ create: { width: 1200, height: 800, channels: 3, background: hue() } }).jpeg().toBuffer())
const notAPhoto = join(dir, 'smoke.pdf')
writeFileSync(notAPhoto, '%PDF-1.4 not a photo')

const b = await chromium.launch()
async function open(viewport, tag) {
  const phone = viewport.width < 500
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, locale: 'uk-UA' })
  const p = await ctx.newPage()
  p.on('dialog', (dlg) => dlg.accept()) // «leave with unsaved changes?» (beforeunload)
  p.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`))
  p.on('response', (r) => r.status() >= 500 && errors.push(`${tag} ${r.status()} ${r.url().replace(BASE, '')}`))
  p.on('console', (m) => m.type() === 'error' && !/hydrat|Download the React DevTools|status of 40[0-9]|Failed to load resource/i.test(m.text()) && errors.push(`${tag} console: ${m.text().slice(0, 200)}`))
  return p
}
const shot = (p, n) => p.screenshot({ path: `.shots/kabinet/${n}.png`, fullPage: true })
const signIn = async (p) => {
  await p.goto(`${BASE}/kabinet/vhid`, { waitUntil: 'networkidle' })
  await p.fill('#auth-login', LOGIN)
  await p.fill('#auth-password', PASSWORD)
  await p.click('button[type=submit]')
  await p.waitForURL(`${BASE}/kabinet`, { timeout: 30000 })
}

const d = await open({ width: 1280, height: 900 }, 'desktop')
try {
// 1. password from the invite (or plain sign-in), then the home page
await d.goto(`${BASE}/kabinet/vhid`, { waitUntil: 'networkidle' })
await shot(d, 'd-01-vhid')
if (INVITE) {
  await d.goto(INVITE, { waitUntil: 'networkidle' })
  await shot(d, 'd-02-parol')
  await d.fill('#auth-login', LOGIN)
  await d.fill('#auth-password', PASSWORD)
  await d.fill('#auth-password2', 'other-password-456')
  await d.click('button[type=submit]')
  await d.waitForSelector('text=Паролі не збігаються')
  await shot(d, 'd-02-parol-mismatch')
  await d.fill('#auth-password2', PASSWORD)
  await d.click('button[type=submit]')
  await d.waitForURL(`${BASE}/kabinet`, { timeout: 30000 })
} else await signIn(d)
await d.waitForSelector('h1')
await shot(d, 'd-03-home')
check((await d.locator('.kb-stud').count()) >= 1, 'home shows no studios')
check(await d.getByRole('button', { name: 'Вийти' }).isVisible(), 'no «Вийти» in the cabinet header')
check(!(await d.locator('[data-request-bar], nav[aria-label="Головна навігація"]').count()), 'site chrome inside the cabinet')

// 2. overview and sections on desktop: the first section opens beside the navigation
const studioHref = await d.locator('.kb-stud-n a').first().getAttribute('href')
const slug = studioHref.split('/').pop()
await d.goto(`${BASE}${studioHref}`, { waitUntil: 'networkidle' })
await shot(d, 'd-04-overview')
check(await d.locator('main h2', { hasText: 'Про студію' }).first().isVisible(), 'desktop overview does not open the first section')
check((await d.locator('aside .ui-srow').count()) === 6, 'side navigation has not 6 rows')

// 3. save a text section («Про студію»): no reload, note on top, bar, «Далі»
await d.goto(`${BASE}/kabinet/studiya/${slug}/pro-studiyu`, { waitUntil: 'networkidle' })
const draftKey = `hlyna:kabinet:draft:${slug}:pro-studiyu`
await d.evaluate((k) => localStorage.removeItem(k), draftKey)
await d.fill('#kb-ownerNews', NEWS)
await d.waitForSelector('text=Є незбережені зміни')
await shot(d, 'd-05-dirty')
await d.waitForTimeout(700)
check(Boolean(await d.evaluate((k) => localStorage.getItem(k), draftKey)), 'no local draft for unsaved text')
await d.click('button:has-text("Зберегти")')
await d.waitForSelector('text=Надіслано на перевірку', { timeout: 20000 })
await d.waitForSelector('.ui-savebar >> text=Далі: послуги')
await shot(d, 'd-06-saved')
check(!(await d.evaluate((k) => localStorage.getItem(k), draftKey)), 'draft not cleared after save')
const cs = await q(`select c.proposed->>'ownerNews' as news from app.change_sets c join app.studios s on s.id=c.studio_id where s.slug=$1 and c.status='pending'`, [slug])
check(cs[0]?.news === NEWS, `change set not saved: ${JSON.stringify(cs)}`)
check(await d.locator('aside .ui-srow', { hasText: 'Про студію' }).locator('.ui-tag[data-state=review]').count(), 'navigation tag did not turn to «на перевірці»')

// 4. draft is offered after a reload
await d.fill('#kb-ownerQuote', 'Смоук: чернетка')
await d.waitForTimeout(700)
await d.goto(`${BASE}/kabinet/studiya/${slug}/pro-studiyu`, { waitUntil: 'networkidle' })
await d.waitForSelector('text=Є незбережена чернетка з')
await shot(d, 'd-07-draft')
await d.click('.ui-savebar button:has-text("Відновити")')
check((await d.inputValue('#kb-ownerQuote')) === 'Смоук: чернетка', 'draft not restored')

// 5. field errors («Контакти»): under the fields, bar with links, focus on the first
await d.goto(`${BASE}/kabinet/studiya/${slug}/kontakty`, { waitUntil: 'networkidle' })
await d.fill('#kb-phone', '099 363')
await d.fill('#kb-instagram', 'osonnya ceramics')
await d.click('button:has-text("Зберегти")')
await d.waitForSelector('.ui-savebar >> text=Перевірте', { timeout: 20000 })
await shot(d, 'd-08-errors')
check((await d.locator('#kb-phone[aria-invalid=true]').count()) === 1, 'phone not marked invalid')
check((await d.evaluate(() => document.activeElement?.id)) === 'kb-phone', 'focus did not go to the first invalid field')
await d.fill('#kb-phone', '+380 99 123 45 67')
await d.fill('#kb-instagram', '@osonnya.ceramics')
await d.click('button:has-text("Зберегти")')
await d.waitForSelector('text=Надіслано на перевірку', { timeout: 20000 })

// 6. photos: a big JPEG, a second one and a PDF; each is saved at once
await d.goto(`${BASE}/kabinet/studiya/${slug}/foto`, { waitUntil: 'networkidle' })
await shot(d, 'd-09-foto-before')
const before = await d.locator('.ui-pgrid > li[data-photo]').count()
await d.setInputFiles('input[type=file]', [photoA, photoB, notAPhoto])
await d.waitForSelector('.ui-pt-im[data-err]', { timeout: 10000 }) // the PDF
check(await d.getByText('Це не фото. Підійдуть JPG, PNG, HEIC').count(), 'no «Це не фото» tile')
await d.waitForFunction((n) => document.querySelectorAll('.ui-pgrid > li[data-photo]').length === n + 2, before, { timeout: 60000 })
await shot(d, 'd-10-foto-added')
const pend = await q(`select count(*)::int as n from app.media m where m.status='pending'`)
check(pend[0].n >= 2, `photos not saved as pending media: ${JSON.stringify(pend)}`)
check((await d.locator('.ui-savebar >> text=Збережено').count()) === 1, 'photo bar does not say «Збережено»')
// reorder with the keyboard: the last photo to the front (Home) and back one step (→)
const tiles = d.locator('.ui-pgrid > li[data-photo]')
const idsBefore = await tiles.evaluateAll((els) => els.map((e) => e.dataset.tile))
await tiles.last().focus()
await d.keyboard.press('Home')
await d.waitForTimeout(800)
const idsAfter = await d.locator('.ui-pgrid > li[data-photo]').evaluateAll((els) => els.map((e) => e.dataset.tile))
check(idsAfter[0] === idsBefore.at(-1), 'Home did not move the photo to the front')
await d.waitForSelector('.ui-savebar >> text=Збережено')
const order = await q(`select c.proposed->'photos' as photos from app.change_sets c join app.studios s on s.id=c.studio_id where s.slug=$1 and c.status='pending'`, [slug])
check(order[0], 'no pending change set after photo actions')
// remove and restore
await d.locator('.ui-pgrid > li[data-photo]').first().getByRole('button', { name: 'Прибрати' }).click()
await d.waitForSelector('.ui-pt[data-gone]')
await shot(d, 'd-11-foto-removed')
await d.getByRole('button', { name: 'Повернути' }).click()
await d.waitForSelector('.ui-pt[data-gone]', { state: 'detached' })

// 7. sign out and in again
await d.goto(`${BASE}/kabinet`)
await d.click('button:has-text("Вийти")')
await d.waitForURL(`${BASE}/kabinet/vhid`)
await d.fill('#auth-login', LOGIN)
await d.fill('#auth-password', 'wrong-password-123')
await d.click('button[type=submit]')
await d.waitForSelector('[role=alert]', { timeout: 15000 })
await shot(d, 'd-12-wrong-password')
await d.fill('#auth-password', PASSWORD)
await d.click('button[type=submit]')
await d.waitForURL(`${BASE}/kabinet`, { timeout: 30000 })

// 8. phone: home, overview, a section, photos
const m = await open({ width: 390, height: 844 }, 'phone')
await m.context().addCookies(await d.context().cookies())
for (const [name, path] of [['home', ''], ['overview', `/studiya/${slug}`], ['pro-studiyu', `/studiya/${slug}/pro-studiyu`], ['posluhy', `/studiya/${slug}/posluhy`], ['tsiny', `/studiya/${slug}/tsiny`], ['biznes', `/studiya/${slug}/biznes`], ['kontakty', `/studiya/${slug}/kontakty`], ['foto', `/studiya/${slug}/foto`]]) {
  await m.goto(`${BASE}/kabinet${path}`, { waitUntil: 'networkidle' })
  await shot(m, `m-${name}`)
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(overflow <= 1, `phone ${name}: horizontal overflow ${overflow}px`)
}
await m.goto(`${BASE}/kabinet/studiya/${slug}`, { waitUntil: 'networkidle' })
check(!(await m.locator('main h2', { hasText: 'Про студію' }).first().isVisible()), 'phone overview shows the first section')

// 9. claim form (anonymous, public page with the site header)
const a = await open({ width: 1280, height: 900 }, 'anon')
const [{ slug: other }] = await q(`select slug from app.studios where visibility='public' and not owner_verified order by id limit 1`)
await a.goto(`${BASE}/kabinet/zayavka?studio=${other}`, { waitUntil: 'networkidle' })
await shot(a, 'a-01-claim')
await a.fill('#claim-name', 'Смоук Тест')
await a.fill('#claim-contact', '@smoke_test')
await a.check('input[name=represents]')
await a.click('button[type=submit]')
await a.waitForSelector('text=/Заявку отримали/', { timeout: 20000 })
await shot(a, 'a-02-claim-sent')
check((await q(`select c.id from app.claims c join app.claim_studios cs on cs.claim_id=c.id join app.studios s on s.id=cs.studio_id where s.slug=$1 and c.name='Смоук Тест'`, [other])).length, 'claim not saved')
} catch (e) {
  console.log(e.message)
  errors.push(`stopped: ${e.message.split('\n')[0]}`)
  await shot(d, 'FAIL-desktop').catch(() => {})
  console.log('bar says:', await d.locator('.ui-savebar').first().innerText().catch(() => '(no bar)'))
}

await b.close()
await DB.end()
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'kabinet smoke OK')
process.exit(errors.length ? 1 : 0)
