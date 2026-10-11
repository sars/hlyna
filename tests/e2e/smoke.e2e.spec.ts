import { expect, test } from '@playwright/test'

// Smoke test of key public pages: they answer, carry their H1 and JSON-LD, and the request form is there.
//   BASE_URL=http://localhost:3000 pnpm test:e2e     (defaults to the dev server)
const BASE = process.env.BASE_URL || 'http://localhost:3000'

const pages = [
  { path: '/', h1: /ручної роботи/iu },
  { path: '/dlya-biznesu/chashky-z-lohotypom', h1: /логотип/iu },
  { path: '/maister-klasy/kyiv', h1: /Київ/u },
  { path: '/tsiny-2026', h1: /Ціни/u },
  { path: '/mapa', h1: /мап/iu },
]

for (const p of pages) {
  test(`${p.path} renders`, async ({ page }) => {
    const res = await page.goto(BASE + p.path)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1').first()).toHaveText(p.h1)
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0)
    await expect(page.locator('header nav').first()).toBeVisible()
  })
}

test('request form is on the logo-mugs page', async ({ page }) => {
  await page.goto(BASE + '/dlya-biznesu/chashky-z-lohotypom')
  await expect(page.locator('form').filter({ hasText: /Отримати пропозиції/u }).first()).toBeVisible()
})

test('desktop mega menu opens with Enter and closes with Escape, focus returns to the section button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }) // handlers are attached after hydration
  const section = page.locator('button.nav-sec').first()
  await section.focus()
  await page.keyboard.press('Enter')
  await expect(section).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.nav-mega:not([hidden])')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(section).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.nav-mega:not([hidden])')).toHaveCount(0)
  await expect(section).toBeFocused()
})

test('phone drawer opens, locks the page, closes with Escape and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' }) // handlers are attached after hydration
  const open = page.getByRole('button', { name: 'Меню' })
  await open.click()
  await expect(page.locator('dialog#mobile-menu')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog#mobile-menu')).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('') // the dialog's close event is asynchronous
  await expect(open).toBeFocused()
  // «Запит →» stays on one line next to the logo
  const cta = page.locator('.nav-actions a')
  expect((await cta.boundingBox())?.height).toBeLessThan(50)
})
