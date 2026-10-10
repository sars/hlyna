# Status

Updated 2026-10-10.

## Now
- Payload 3.90 "website" template on Next.js 16, Postgres adapter, runs locally (`pnpm dev`).
- Production setup written, not deployed yet: `Dockerfile`, `compose.yaml` (app + db + caddy), `Caddyfile` (hlyna.com.ua primary, www + hlyna.com → 301), `deploy/` (README, release, backup, restore, systemd timer).
- Claude Code: `.claude/settings.json` (permissions, guard hook, tsc-on-stop hook), agents `explorer` / `implementer` / `reviewer`, skill `payload`.
- Screenshots: `pnpm shots /route` → `.shots/` (390px + 1280px).
- Writing voice: `docs/voice/`.

## Before the first deploy
1. `output: 'standalone'` in `next.config.ts`.
2. Build without a database: pages with `generateStaticParams` must return `[]` when the DB is unreachable (the db container is not on the build network).
3. Production migrations: `pnpm payload migrate:create`, commit `src/migrations/`, and run them on start (`prodMigrations` in the Postgres adapter).
4. A `/api/health` route; then point the compose healthcheck at it.
5. Owner: VPS, DNS A records, `.env` on the server (see `deploy/README.md`).

## Next
- Collections for studios, master classes, prices, requests; import from `UkraineCeramics/_master/`.
- Design tokens 1A in Tailwind, component kit, home page.
- Request form → admin → Telegram notification.

## Reminders (2026-10-10)
- **Instagram pass** (needs a `claude --chrome` session): collect 1–3 pinned/latest post URLs per public studio for lazy-loaded embeds; read captions and images to add a unique, paraphrased paragraph to each profile.
- **Telegram:** add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to the server `.env` after deploy.
- **Photos for hub pages:** pick less "stocky", documentary photos (e.g. Wikimedia Commons workshops in Opishne/Kosiv, with credit) until studios send their own.

## Topic pages (2026-10-10)
- Config: `src/content/topics.ts`; layout: `src/components/site/TopicPage.tsx`; data: `src/lib/topics.ts`.
- Lists come from `studios.formats` tags (`pnpm payload run scripts/tag-studios.ts`, re-run after each import; DRY=1 SHOW=<tag> prints evidence).
- Photos: `public/images/doc/` (Wikimedia Commons, credits in CREDITS.md, visible caption via `<DocPhoto>` and on OG cards).
- IndexNow: `deploy/indexnow.sh` runs at the end of `deploy/push.sh`; key file `public/12e1186b0c0ec23ee49b7f8359e536ca.txt`.
- Production needs, after deploy: the `add_formats` migration (runs on start) and `scripts/tag-studios.ts` against the production DB, otherwise the topic lists are empty.

## Review 2 fixes (2026-10-10)
- Numbers: prices only from the live price index via `src/lib/facts.ts` (`facts().range('group' | 'private' | 'couple' | 'kids' | 'course' | 'cert' | 'corporate' | 'cup' | 'plate' | 'vase' | 'jewelry')`); topic pages with `price.index` quote the same range. Lead times only from `site.lead` (batch 3–8 weeks, logo 4–10, one custom piece 3–6, pick-up after a class 2–4).
- Research notes never reach pages: `cleanPublic` / `cleanAddress` in `src/lib/present.ts`, applied when the catalogue loads (`src/lib/catalog.ts`).
- Unverified studios (text doubts activity after 2022, no Instagram post since 2025) and closed ones: profile only, with a note; out of lists, counts, map, price index. `getCatalog()` = everything published, `getAllStudios()` = listed. `scripts/refresh-status.ts` marks «unclear» studios with a 2025+ post as active and prints the unverified list.
- Display names: `cleanName` drops addresses, marketplace suffixes and spelling variants from headings (variants stay in alternateNames).

## Next (after P1) — from docs/reviews/2026-10-10-review-2-fable.md
Done in the same pass: group totals out of per-person ranges; museums and exhibit-only makers off class lists; request form fields by kind; Instagram block shows a compact card until the embed loads; city jump list on long topic pages; 5% once on the home page (+ FAQ, form note); doubled «вартість — ціни»; «Що нового:»; «полива» in product texts; addresses tidied; USD/EUR prices labelled; JSON-LD (Article author/dates, typed ItemList via `src/lib/ld.ts`, no empty sameAs, streetAddress from the street, priceRange); `/pro-nas`.
Still open:
- P2.12 Cards: three-line clamp hides prices (show the price line first and in full); «Косів і Опішне»: people listed under «Крамниці, музеї, школи»; Kryvyi Rih «Де подивитися»: a news site listed as a place; New Year page evidence from a 2024 exhibition; group headings without counts.
- P2.9 rest: evidence lines that are not about the format (e.g. a summary sentence); sculptors without classes on format lists when they have a technique tag.
- P2.14 rest: Russian names (e.g. «Синий Краб», «Творцы Одессы») need a documented Ukrainian variant in alternateNames; «Glinland»/«glinland» casing; «Дитячі майстерки».
- P3.15 aliases in H1 — done by cleanName; P3.16 home H1 shorter; P3.17 home stats twice; P3.19 «активний у 2026» on city cards; P3.20 epigraphs off business pages; P3.21 OG for profiles (first Instagram post or pattern).
- Needs new data: «Забронювати» buttons (KAVA/Bodo/tvoeshop/own site), phones and opening hours, business terms in profiles (min order, lead time), delivery terms, response time per studio.
