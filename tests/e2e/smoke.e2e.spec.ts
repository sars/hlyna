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
