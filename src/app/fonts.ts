import { Golos_Text, JetBrains_Mono, Playfair_Display, Unbounded } from 'next/font/google'

// The site's fonts, shared by the public layout and the studio cabinet's own root layout. Downloaded at build time and
// served from our own domain (no requests to Google at runtime).
const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['600', '800'], variable: '--font-unbounded', display: 'swap' })
const golos = Golos_Text({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600'], variable: '--font-golos', display: 'swap' })
// Below the first screen: not preloaded.
const playfair = Playfair_Display({ subsets: ['cyrillic', 'latin'], weight: ['400'], style: ['italic'], variable: '--font-playfair', display: 'swap', preload: false })
const jetbrains = JetBrains_Mono({ subsets: ['cyrillic', 'latin'], weight: ['500'], variable: '--font-jetbrains', display: 'swap', preload: false })

export const fontVars = `${unbounded.variable} ${golos.variable} ${playfair.variable} ${jetbrains.variable}`
