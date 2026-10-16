import { preload } from 'react-dom'

import './fonts.css'

// The site's fonts, shared by the public layout and the studio cabinet's own root layout: committed woff2 files in
// public/fonts with their @font-face rules in fonts.css (copied from what next/font/google produced), so neither the
// build nor a visitor ever asks Google. The first screen's faces (Unbounded, Golos Text; latin and cyrillic) load early;
// Playfair Display italic and JetBrains Mono load when used.
const FIRST_SCREEN = ['unbounded-latin', 'unbounded-cyrillic', 'golos-text-latin', 'golos-text-cyrillic']

export function preloadFonts() {
  for (const f of FIRST_SCREEN) preload(`/fonts/${f}.woff2`, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
}
