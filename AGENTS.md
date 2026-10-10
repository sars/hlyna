# AGENTS.md — глина.юа (hlyna.com.ua)

Catalogue of Ukrainian handmade ceramics. Goal: **requests and traffic, mainly via LLMs and search**; ~1,000 indexed pages. Read `docs/STATUS.md` first, decisions are in `docs/decisions.md`, the writing voice in `docs/voice/`. Raw research data lives outside this repo in `../UkraineCeramics/` (`_master/all_entries.jsonl`, rules in its `CLAUDE.md`).

## Who we build for
1. **Business buyers (priority):** restaurants, cafés, hotels (tableware), companies (gifts, logo mugs, corporate clay workshops), agencies.
2. **Traffic engine:** people looking for a master class, pottery date, kids' class or gift certificate in their city. Every such page also points to business offers.
3. **Studios and makers:** free profile; they pay 5% only from orders that happened.

## Rules for every page
- **Request first:** «Отримати пропозиції» visible at the top, after the answer and at the end.
- **LLM-ready:** first 2–3 sentences are plain facts with numbers and a date; then a table; then details; then FAQ. schema.org JSON-LD (`src/components/site/JsonLd.tsx`), clean headings, «Оновлено» date. No thin pages: list pages need ≥3 real entries.
- **Honest:** only collected data; never invent studios, prices, cases, reviews. Say the model openly but briefly (`site.model` in `src/content/site.ts`). Don't publish the legal entity.
- **Flexible wording:** no site-wide «від 30 штук»; minimum order lives in profiles. «Корпоратив з ліплення з глини».
- **Voice:** `docs/voice/README.md` — factual lead, then at most one short verse epigraph (`Epigraph`, `src/content/verses.ts`), then warm, clear potters' prose. Never explain the verse.
- **Language:** Ukrainian only; English later via Payload localization and `/en` routes; never Russian.
- **Scope:** studio-scale ceramics made in Ukraine. Makers who now work abroad, suppliers, factories, media, course platforms and gift-certificate aggregators stay as drafts.
- **Photos:** only with the maker's consent; stock photos (`public/images/stock`, CC0) only for site chrome.
- **Mobile first and fast:** server components by default, client components only for interaction, `next/image`, fonts self-hosted by `next/font`.
- **No paid services** without the owner's explicit approval.

## Stack
Next.js 16 (App Router) + Payload 3 (admin at `/admin`, Postgres) + Tailwind 4 with design tokens 1A in `src/app/(frontend)/globals.css` (`bg-clay`, `text-cobalt`, `bg-terra`, `text-umber`, `border-line`, `font-display`, utilities `kicker`, `h-display`, `band`). Fonts: Unbounded (headings) + Raleway (body).

## Where things are
- `src/content/` — site facts (`site.ts`) and navigation (`navigation.ts`). Copy and menus are edited here, by an LLM.
- `src/components/site/` — header, mega menu, footer, request form, JSON-LD.
- `src/app/(frontend)/` — public pages; `llms.txt`, `health`, `manifest` routes.
- `src/collections/` — Payload collections: Studios, Cities, Requests (+ template Pages, Posts, Media, Users).
- `scripts/` — `import-studios.ts` (data → DB), `shots.mjs` (phone + desktop screenshots).
- `deploy/` — Docker Compose + Caddy on the owner's VPS, backups (`deploy/README.md`).

## Commands
- `pnpm dev` — site on http://localhost:3000, admin on /admin (local Postgres `hlyna`).
- `pnpm shots /path` — screenshots to `.shots/` (dev server must run). Look once per finished screen.
- `pnpm import:studios` — import/refresh studios from `../UkraineCeramics/_master/all_entries.jsonl` (unchanged ones are skipped). `pnpm import:studios:prune` also deletes studios gone from the data that nobody enriched. `pnpm find:duplicates` lists likely duplicates; record them in `../UkraineCeramics/_ops/name_aliases.tsv`, run `python3 _ops/merge.py` there, then prune.
- `pnpm generate:types` after collection changes; `pnpm exec tsc --noEmit` before finishing (the Stop hook runs it).
- `pnpm build` — production build (needs the database reachable).

## How to work
Act when you have enough information; recommend rather than list options. Prefer the better solution for the goals over the easiest one, but don't add abstractions the task doesn't need. Commit in small steps with clear messages; never push or deploy without the owner. Verify with a command or a screenshot before saying something works.
