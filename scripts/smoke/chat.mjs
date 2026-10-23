// Chat smoke: the flows end to end against the dev server and the fake Telegram (scripts/smoke/fake-telegram.mjs),
// with the real model (about ten turns, roughly half a dollar on gpt-5.5): a business lead reaches the owner before
// the answer, the owner steps in from Telegram («Взяти», Reply, /done), a visitor asks for a person, «Продовжити в
// Telegram» both ways, a request with a contact, offline mode, the phone dialog. Prints PASS/FAIL per check.
//
//   node scripts/smoke/fake-telegram.mjs                                                      (port 3999)
//   DATABASE_URL=postgres://localhost/hlyna_merge TELEGRAM_API_BASE=http://localhost:3999 TELEGRAM_BOT_TOKEN=fake \
//     TELEGRAM_CHAT_ID=777 TELEGRAM_WEBHOOK_SECRET=s pnpm dev
//   node scripts/smoke/chat.mjs
import { execSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const base = 'http://localhost:3000'
const fake = 'http://localhost:3999'
const OWNER = 777
const results = []
const check = (name, ok, extra = '') => {
  results.push([ok, name, extra])
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}
const sentAll = async () => (await fetch(`${fake}/_sent`)).json()
const clearSent = () => fetch(`${fake}/_sent`, { method: 'DELETE' })
const ownerSent = async () => (await sentAll()).filter((s) => s.method === 'sendMessage' && String(s.params.chat_id) === String(OWNER))
const webhook = (update) => fetch(`${base}/api/telegram/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': 's' }, body: JSON.stringify(update) })
const ownerReply = (replyTo, text, id = Date.now() % 100000) => webhook({ message: { message_id: id, chat: { id: OWNER }, from: { id: OWNER }, text, reply_to_message: { message_id: replyTo } } })
const ownerTap = (data) => webhook({ callback_query: { id: 'cq' + Date.now(), from: { id: OWNER }, data } })
const psql = (q) => execSync(`psql hlyna_merge -tAc "${q.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim()
const waitFor = async (fn, ms = 60_000, step = 400) => {
  const t0 = Date.now()
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() - t0 > ms) return null
    await new Promise((r) => setTimeout(r, step))
  }
}
const settled = (page) => page.waitForFunction(() => !document.querySelector('.hl-chat-cursor') && !document.querySelector('.hl-chat-dots') && ![...document.querySelectorAll('form button[type=submit]')].some((b) => b.disabled && b.textContent.includes('…')), null, { timeout: 90_000 })
const lines = (page, role) => page.evaluate((r) => [...document.querySelectorAll(`li[data-role=${r}] .hl-chat-text`)].map((e) => e.textContent), role)
const status = (page) => page.locator('#zapyt-forma header .hl-chat-note').first().textContent()
const send = async (page, text) => {
  const box = page.locator('#zapyt-forma')
  await box.locator('textarea[name=text]').fill(text)
  await box.locator('form:has(textarea[name=text]) button[type=submit]').first().click()
  await settled(page)
  await page.waitForTimeout(400)
}
const headOf = async (convId) => (await ownerSent()).find((s) => s.params.text.startsWith(`💬 Чат #${convId}`))
const convIdOnPage = async (page) => {
  const pub = await page.evaluate(() => new URL(document.querySelector('a[href*="t.me"]')?.href ?? 'http://x/?start=c_').searchParams.get('start')?.slice(2) ?? null)
  return pub ? Number(psql(`select id from chat.conversations where public_id='${pub}'`)) : Number(psql(`select id from chat.conversations order by id desc limit 1`))
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'uk-UA' })
const page = await ctx.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
await webhook({ message: { message_id: 1, chat: { id: OWNER }, from: { id: OWNER }, text: '/auto' } })
await clearSent()

// ---------- A. business lead: the owner hears at once, then steps in
await page.goto(`${base}/dlya-biznesu/chashky-z-lohotypom`, { waitUntil: 'load' })
await page.waitForTimeout(1200)
const t0 = Date.now()
const box = page.locator('#zapyt-forma')
await box.locator('textarea[name=text]').fill('Потрібно 100 чашок з логотипом до 15 грудня для компанії')
await box.locator('form:has(textarea[name=text]) button[type=submit]').first().click()
const alert = await waitFor(async () => (await ownerSent()).find((s) => s.params.text.startsWith('🏢')), 15_000, 200)
const alertAt = Date.now() - t0
await settled(page)
const answeredAt = Date.now() - t0
check('A1 business alert reaches the owner', Boolean(alert), `after ${alertAt} ms, answer after ${answeredAt} ms`)
check('A2 alert comes before the answer', alert && alertAt < answeredAt)
const convA = Number(psql(`select id from chat.conversations order by id desc limit 1`))
const head = await headOf(convA)
check('A3 head message sent once', (await ownerSent()).filter((s) => s.params.text.startsWith('💬')).length === 1 && Boolean(head))
check('A4 alert threads under the head', alert?.params.reply_parameters?.message_id === head?.message_id)
check('A5 alert has «Взяти»', JSON.stringify(alert?.params.reply_markup ?? {}).includes(`ch:t:${convA}`))
const a1 = await lines(page, 'assistant')
check('A6 assistant answered the lead', (a1.at(-1) ?? '').length > 40, (a1.at(-1) ?? '').slice(0, 80))
await ownerTap(`ch:t:${convA}`)
const joined = await waitFor(async () => (await lines(page, 'system')).some((t) => t.includes('приєдналась')), 15_000)
check('B1 «Взяти» shows «людина приєдналась» on the page', Boolean(joined))
check('B2 status line says the person is in', (await status(page))?.includes('на зв’язку'))
await ownerReply(head.message_id, 'Вітаю! Я з Глини. Для 100 чашок логотип краще деколлю, скажу терміни.', 5001)
const human = await waitFor(async () => (await lines(page, 'human')).find((t) => t.includes('деколлю')), 15_000)
check('B3 owner’s Reply lands on the page', Boolean(human))
await clearSent()
const before = (await lines(page, 'assistant')).length
await send(page, 'Дякую, чекаю деталей')
const relayed = await waitFor(async () => (await ownerSent()).find((s) => s.params.text === '👤 Дякую, чекаю деталей'), 10_000)
check('B4 visitor’s line relayed to the owner while a person is in', Boolean(relayed))
check('B5 assistant stays quiet while a person is in', (await lines(page, 'assistant')).length === before)
await ownerReply(head.message_id, '/done', 5002)
const back = await waitFor(async () => (await lines(page, 'system')).some((t) => t.includes('знову на зв’язку')), 15_000)
check('B6 /done hands the thread back', Boolean(back))
await send(page, 'А які терміни на партію?')
check('B7 assistant answers again after /done', (await lines(page, 'assistant')).length === before + 1)

// ---------- C. the visitor leaves a contact, a request is created
await clearSent()
await send(page, 'Так, передайте запит студіям. Мій телефон +380671234567, Олена')
const reqId = await waitFor(() => psql(`select request_id from chat.conversations where id=${convA}`) || null, 5_000)
check('C1 create_request made a request from the chat', Boolean(reqId), `request #${reqId}`)
const req = reqId ? psql(`select what||'|'||coalesce(quantity,'')||'|'||coalesce(contact_phone_or_telegram,'')||'|'||coalesce(contact_name,'')||'|'||coalesce(source_page,'') from app.requests where id=${reqId}`) : ''
check('C2 request carries kind, quantity, contact, name and page', /logo-mugs\|.*100.*\|\+380671234567\|Олена\|\/dlya-biznesu/.test(req), req)
const reqMsg = (await ownerSent()).find((s) => s.params.text.startsWith('Новий запит #'))
check('C3 owner got the request message', Boolean(reqMsg))
check('C4 conversation remembers the contact', psql(`select contact from chat.conversations where id=${convA}`).includes('380671234567'))

// ---------- D. a visitor asks for a person; continues in Telegram
await clearSent()
await page.goto(`${base}/maister-klasy/lviv`, { waitUntil: 'load' })
await page.waitForTimeout(1200)
await send(page, 'Хочу поговорити з живою людиною')
const convD = await convIdOnPage(page)
check('D1 status: waiting for a person', (await status(page))?.includes('люди'), await status(page))
const ask = (await ownerSent()).find((s) => s.params.text.includes('просить людину'))
check('D2 owner got «просить людину»', Boolean(ask))
const tgLink = await page.locator('#zapyt-forma a[href*="t.me"]').getAttribute('href').catch(() => null)
check('D3 «Продовжити в Telegram» link shown', Boolean(tgLink && tgLink.includes('hlyna_fake_bot')), tgLink ?? '')
check('D4 contact field shown while waiting', (await page.locator('#zapyt-forma textarea[aria-label="Контакт для відповіді"]').count()) === 1)
const nA = (await lines(page, 'assistant')).length
await send(page, 'А скільки коштує заняття для двох?')
check('D5 assistant still answers while waiting', (await lines(page, 'assistant')).length === nA + 1)
check('D6 and the line is relayed to the owner', Boolean((await ownerSent()).find((s) => s.params.text.startsWith('👤 А скільки'))))
const pub = new URL(tgLink).searchParams.get('start').slice(2)
await webhook({ message: { message_id: 7001, chat: { id: 4242 }, from: { id: 4242 }, text: `/start c_${pub}` } })
const linked = await waitFor(async () => (await lines(page, 'system')).some((t) => t.includes('Telegram')), 15_000)
check('D7 deep link links the visitor’s Telegram, the page says so', Boolean(linked))
check('D8 welcome sent to the visitor in Telegram', Boolean((await sentAll()).find((s) => String(s.params.chat_id) === '4242' && s.params.text.includes('на зв’язку з Глиною'))))
await webhook({ message: { message_id: 7002, chat: { id: 4242 }, from: { id: 4242 }, text: 'Є заняття у суботу?' } })
const tgAnswer = await waitFor(async () => (await sentAll()).filter((s) => String(s.params.chat_id) === '4242').at(-1)?.params.text?.length > 20, 60_000)
check('D9 a line from Telegram gets the assistant’s answer in Telegram', Boolean(tgAnswer))
const onPage = await waitFor(async () => (await lines(page, 'visitor')).some((t) => t.includes('у суботу')), 15_000)
check('D10 …and it shows on the page too', Boolean(onPage))
const headD = await headOf(convD)
await ownerReply(headD.message_id, 'Так, у суботу є місця.', 5003)
const both = await waitFor(async () => (await sentAll()).find((s) => String(s.params.chat_id) === '4242' && s.params.text === 'Так, у суботу є місця.'), 15_000)
check('D11 owner’s Reply reaches the visitor in Telegram and on the page', Boolean(both) && Boolean(await waitFor(async () => (await lines(page, 'human')).some((t) => t.includes('у суботу є')), 10_000)))

// ---------- E. offline: the hand-over asks for a contact right away
await webhook({ message: { message_id: 2, chat: { id: OWNER }, from: { id: OWNER }, text: '/offline' } })
await clearSent()
await page.goto(`${base}/vyrobnyky/zirka-z-neba`, { waitUntil: 'load' })
await page.waitForTimeout(1200)
await send(page, 'Покличте, будь ласка, людину')
const lastA = (await lines(page, 'assistant')).at(-1) ?? ''
check('E1 offline hand-over asks for a contact in the same answer', /телефон|Telegram|пошт/i.test(lastA), lastA.slice(0, 90))
check('E2 status says the person answers later', (await status(page))?.includes('сьогодні'), await status(page))
await webhook({ message: { message_id: 3, chat: { id: OWNER }, from: { id: OWNER }, text: '/auto' } })

// ---------- F. the phone dialog
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'uk-UA', hasTouch: true })
const mp = await mctx.newPage()
mp.on('pageerror', (e) => pageErrors.push(e.message))
await mp.goto(`${base}/vyrobnyky/zirka-z-neba`, { waitUntil: 'load' })
await mp.waitForTimeout(1200)
await mp.evaluate(() => window.scrollTo(0, 0))
await mp.waitForTimeout(600)
await mp.locator('[data-request-bar] button').first().click()
await mp.waitForTimeout(500)
check('F1 the bar opens the full-screen chat', await mp.locator('dialog[open].hl-chat-dlg').count() === 1)
await mp.locator('dialog[open] textarea[name=text]').fill('Скільки коштує заняття?')
await mp.locator('dialog[open] form:has(textarea[name=text]) button[type=submit]').first().click()
await settled(mp)
check('F2 answer arrives in the dialog', (await mp.evaluate(() => document.querySelectorAll('dialog[open] li[data-role=assistant]').length)) >= 2)
await mp.locator('dialog[open] .hl-chat-dlg-top button').click()
await mp.waitForTimeout(400)
check('F3 closing keeps the thread inline', (await mp.evaluate(() => document.querySelectorAll('#zapyt-forma li[data-role=visitor]').length)) === 1 && (await mp.evaluate(() => document.body.style.overflow)) === '')
await mctx.close()

check('Z no page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200))
await browser.close()
const failed = results.filter(([ok]) => !ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
