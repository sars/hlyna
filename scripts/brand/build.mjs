// Brand kit: logo files in public/brand (SVG, PNG, PDF) from two sources — the jug mark (paths of public/favicon.svg)
// and the «ГЛИНА» outline (scripts/brand/wordmark.json). Run: node scripts/brand/build.mjs
// Proportions follow the site header: mark box 26 : cap line 22, gap 10, centred on the caps.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from '@playwright/test'

const OUT = 'public/brand'
const C = { terracotta: '#b4532e', terracottaDark: '#d9663d', ink: '#15130f', paper: '#efe9de', cobalt: '#1d3ec6', peach: '#ffd9a8', white: '#ffffff' }

// Colour schemes: [mark, word, background for previews/avatars]
const SCHEMES = {
  primary: { mark: C.terracotta, word: C.ink, bg: C.paper }, // on paper, white or any light background
  'on-dark': { mark: C.terracottaDark, word: C.paper, bg: C.ink }, // on ink/black
  'on-cobalt': { mark: C.peach, word: C.paper, bg: C.cobalt }, // on the cobalt panels
  'mono-ink': { mark: C.ink, word: C.ink, bg: C.paper }, // one colour: stamps, engraving, fax-style print
  'mono-white': { mark: C.white, word: C.white, bg: C.ink }, // one colour reversed: on photos
}

const MARK = (fill) =>
  `<g fill="${fill}"><path fill-rule="evenodd" d="M32 17 A21 21 0 1 1 31.99 17 Z M32 27.2 A10.8 10.8 0 1 0 32.01 27.2 Z"/><path d="M23.3 4 H40.7 L35.7 18 H28.3 Z"/><rect x="23.5" y="59" width="17" height="3.6"/></g>`
const MARK_BOX = { x: 11, y: 4, w: 42, h: 58.6 } // drawn area inside the 64 viewBox

const WORD = JSON.parse(fs.readFileSync('scripts/brand/wordmark.json', 'utf8')).d
const nums = WORD.match(/-?\d+(\.\d+)?/g).map(Number)
const xs = nums.filter((_, i) => i % 2 === 0)
const ys = nums.filter((_, i) => i % 2 === 1)
const W = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
const word = (fill, tx, ty) => `<path fill="${fill}" transform="translate(${tx} ${ty})" d="${WORD}"/>`
const r = (n) => Math.round(n * 100) / 100

// Shapes in their own unit space; each returns { w, h, body(scheme) } with a tight box.
function markShape() {
  return { w: MARK_BOX.w, h: MARK_BOX.h, body: (s) => `<g transform="translate(${-MARK_BOX.x} ${-MARK_BOX.y})">${MARK(s.mark)}</g>` }
}
function wordShape() {
  return { w: r(W.w), h: r(W.h), body: (s) => word(s.word, r(-W.x), r(-W.y)) }
}
function horizontalShape() {
  // header: text 22px (font-size 100 here → ×100/22), mark box 26px → 118.2, gap 10px → 45.5; mark box centred on the caps
  const k = 100 / 22
  const box = 26 * k
  const gap = 10 * k
  const m = box / 64 // mark viewBox → units
  const capMid = W.y + W.h / 2
  const boxTop = capMid - box / 2
  const markTop = boxTop + MARK_BOX.y * m
  const markBottom = boxTop + (MARK_BOX.y + MARK_BOX.h) * m
  const top = Math.min(markTop, W.y)
  const bottom = Math.max(markBottom, W.y + W.h)
  const markLeft = 0
  const wordLeft = MARK_BOX.w * m + gap
  return {
    w: r(wordLeft + W.w),
    h: r(bottom - top),
    body: (s) =>
      `<g transform="translate(${r(markLeft - MARK_BOX.x * m)} ${r(boxTop - top)}) scale(${r(m)})">${MARK(s.mark)}</g>` +
      word(s.word, r(wordLeft - W.x), r(-top)),
  }
}
function stackedShape() {
  const mh = W.h * 2.2 // mark drawn height
  const m = mh / MARK_BOX.h
  const mw = MARK_BOX.w * m
  const gap = W.h * 0.55
  const w = Math.max(W.w, mw)
  return {
    w: r(w),
    h: r(mh + gap + W.h),
    body: (s) =>
      `<g transform="translate(${r((w - mw) / 2 - MARK_BOX.x * m)} ${r(-MARK_BOX.y * m)}) scale(${r(m)})">${MARK(s.mark)}</g>` +
      word(s.word, r((w - W.w) / 2 - W.x), r(mh + gap - W.y)),
  }
}

const SHAPES = { mark: markShape(), wordmark: wordShape(), horizontal: horizontalShape(), stacked: stackedShape() }

const svg = (shape, scheme, { pad = 0, bg = null, size = null } = {}) => {
  const w = shape.w + pad * 2
  const h = shape.h + pad * 2
  const view = size ? `0 0 ${size.w} ${size.h}` : `0 0 ${r(w)} ${r(h)}`
  const inner = size
    ? (() => {
        const k = Math.min((size.w * size.fill) / shape.w, (size.h * size.fill) / shape.h)
        return `<g transform="translate(${r((size.w - shape.w * k) / 2)} ${r((size.h - shape.h * k) / 2)}) scale(${r(k)})">${shape.body(scheme)}</g>`
      })()
    : `<g transform="translate(${pad} ${pad})">${shape.body(scheme)}</g>`
  const rect = bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}"${size ? ` width="${size.w}" height="${size.h}"` : ''}><title>Глина</title>${rect}${inner}</svg>\n`
}

const write = (rel, data) => {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, data)
  return p
}
const png = async (rel, svgText, width) => {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  await sharp(Buffer.from(svgText), { density: 600 }).resize({ width }).png({ compressionLevel: 9 }).toFile(p)
}

for (const d of ['svg', 'png', 'pdf', 'social', 'email', 'index.html']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true }) // README.md stays

// 1) SVG masters: every shape × scheme, tight box, transparent
for (const [name, shape] of Object.entries(SHAPES))
  for (const [sname, scheme] of Object.entries(SCHEMES)) write(`svg/hlyna-${name}-${sname}.svg`, svg(shape, scheme))

// 2) PNG, transparent, with a small margin so antialiased edges never touch the border
const PNG = {
  mark: { primary: [32, 64, 128, 256, 512, 1024], 'on-dark': [256, 512, 1024], 'on-cobalt': [512], 'mono-ink': [512], 'mono-white': [512] },
  horizontal: { primary: [240, 480, 960, 1920], 'on-dark': [480, 960, 1920], 'on-cobalt': [960], 'mono-ink': [960], 'mono-white': [960] },
  stacked: { primary: [512, 1024], 'on-dark': [512, 1024], 'on-cobalt': [1024], 'mono-ink': [1024], 'mono-white': [1024] },
  wordmark: { primary: [960], 'on-dark': [960], 'mono-white': [960] },
}
for (const [name, bySch] of Object.entries(PNG))
  for (const [sname, widths] of Object.entries(bySch)) {
    const shape = SHAPES[name]
    const text = svg(shape, SCHEMES[sname], { pad: Math.max(shape.w, shape.h) * 0.04 })
    for (const w of widths) await png(`png/hlyna-${name}-${sname}-${w}.png`, text, w)
  }

// 3) Ready-made pictures on a background: avatars, cover, email signature
const avatar = (shape, sname, side, fill) => svg(shape, SCHEMES[sname], { bg: SCHEMES[sname].bg, size: { w: side, h: side, fill } })
await png('social/avatar-mark-paper-1080.png', avatar(SHAPES.mark, 'primary', 1080, 0.56), 1080)
await png('social/avatar-mark-ink-1080.png', avatar(SHAPES.mark, 'on-dark', 1080, 0.56), 1080)
await png('social/avatar-mark-cobalt-1080.png', avatar(SHAPES.mark, 'on-cobalt', 1080, 0.56), 1080)
await png('social/avatar-stacked-paper-1080.png', avatar(SHAPES.stacked, 'primary', 1080, 0.62), 1080)
await png('social/avatar-mark-paper-400.png', avatar(SHAPES.mark, 'primary', 400, 0.56), 400)
await png('social/cover-paper-1500x500.png', svg(SHAPES.horizontal, SCHEMES.primary, { bg: C.paper, size: { w: 1500, h: 500, fill: 0.42 } }), 1500)
await png('social/cover-ink-1500x500.png', svg(SHAPES.horizontal, SCHEMES['on-dark'], { bg: C.ink, size: { w: 1500, h: 500, fill: 0.42 } }), 1500)
await png('email/signature-horizontal-600x120.png', svg(SHAPES.horizontal, SCHEMES.primary, { bg: C.white, size: { w: 600, h: 120, fill: 0.7 } }), 600)

// 4) PDF (vector) for print: primary and one-colour versions
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, sname] of [['horizontal', 'primary'], ['horizontal', 'mono-ink'], ['stacked', 'primary'], ['stacked', 'mono-ink'], ['mark', 'primary']]) {
  const shape = SHAPES[name]
  const pad = Math.max(shape.w, shape.h) * 0.1
  const wmm = 100
  const hmm = (wmm * (shape.h + pad * 2)) / (shape.w + pad * 2)
  await page.setContent(`<html><body style="margin:0">${svg(shape, SCHEMES[sname], { pad }).replace('<svg ', `<svg style="display:block;width:${wmm}mm;height:${r(hmm)}mm" `)}</body></html>`)
  await page.pdf({ path: path.join(OUT, `pdf/hlyna-${name}-${sname}.pdf`), width: `${wmm}mm`, height: `${r(hmm) + 0.1}mm`, printBackground: true, pageRanges: '1' })
}
await browser.close()

// 5) Contact sheet for a quick look
const files = fs.readdirSync(path.join(OUT, 'svg')).sort()
const cells = files
  .map((f) => {
    const sname = Object.keys(SCHEMES).find((s) => f.endsWith(`-${s}.svg`))
    return `<figure style="margin:0 0 16px"><div style="background:${SCHEMES[sname].bg};padding:24px;display:grid;place-items:center;height:140px"><img src="svg/${f}" style="max-width:90%;max-height:110px"></div><figcaption style="font:12px monospace;margin-top:4px">${f}</figcaption></figure>`
  })
  .join('')
write('index.html', `<!doctype html><meta charset="utf-8"><title>Глина — логотип</title><body style="margin:24px;font-family:sans-serif;background:#fff"><h1 style="font-size:18px">Глина — файли логотипа (див. README.md)</h1><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0 16px">${cells}</div></body>\n`)

console.log(`brand kit → ${OUT}: ${fs.readdirSync(OUT, { recursive: true }).filter((f) => /\.\w+$/.test(f)).length} files`)
