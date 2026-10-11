// Guide pages (/hayidy/*) and the page for studios (/dlya-studiy). Text in the site voice (docs/voice):
// the lead is plain facts with live numbers (GuideCtx), at most one verse, then clear prose, tables and FAQ.
// Only facts we can stand behind: numbers come from the catalogue and price index; general ceramics facts
// (firing, glazes, lead and cadmium) are well established; advice is worded as advice.
import { orderBatch } from './yak-zamovyty-partiyu'
import { foodSafety } from './kharchova-bezpechnist'
import { reorders } from './dozamovlennya-posudu'
import { chooseClass } from './yak-obraty-maister-klas'
import type { Guide } from './shared'

export * from './shared'
export { studioPage } from './dlya-studiy'
export { aboutPage } from './pro-nas'

export const guides: Guide[] = [orderBatch, foodSafety, reorders, chooseClass]
