// Screenshots at phone (390px) and desktop (1280px) width into .shots/.
//
//   pnpm dev                       in another shell
//   pnpm shots                     home page
//   pnpm shots / /posts /admin
//   SHOTS_BASE=https://hlyna.com.ua pnpm shots /
//   SHOTS_DARK=1 pnpm shots        also dark color scheme
//
// Page errors and console errors are printed: a broken screen can still look fine.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.SHOTS_BASE ?? 'http://localhost:3000';
const requested = process.argv.slice(2);
const routes = requested.length ? requested : ['/'];
const schemes = process.env.SHOTS_DARK ? ['light', 'dark'] : ['light'];
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];
const out = '.shots';
await mkdir(out, { recursive: true });

let errors = 0;
const browser = await chromium.launch();
try {
  for (const colorScheme of schemes) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1, locale: 'uk-UA' });
      const page = await context.newPage();
      page.on('pageerror', (e) => { errors++; console.error(`page error on ${page.url()}: ${e.message}`); });
      page.on('console', (m) => {
        if (m.type() === 'error') { errors++; console.error(`console error on ${page.url()}: ${m.text()}`); }
      });
      for (const route of routes) {
        const res = await page.goto(base + route, { waitUntil: 'load', timeout: 60_000 });
        if (res && res.status() >= 400) console.error(`HTTP ${res.status()} on ${route}`);
        // Scroll down once so lazy images load before the full-page shot.
        await page.evaluate(async () => {
          const step = window.innerHeight * 0.8;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 200));
        });
        const name = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-');
        const file = `${out}/${name}-${viewport.name}${colorScheme === 'dark' ? '-dark' : ''}.png`;
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (errors) console.error(`${errors} error(s) logged`);
