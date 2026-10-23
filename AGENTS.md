# AGENTS.md — глина.юа (hlyna.com.ua)

Catalogue of Ukrainian handmade ceramics. Goal: **requests and traffic, mainly via LLMs and search**; ~1,000 indexed pages. Read `docs/STATUS.md` first, decisions are in `docs/decisions.md`, the writing voice in `docs/voice/`. Raw research data lives outside this repo in `../UkraineCeramics/` (`_master/all_entries.jsonl`, rules in its `CLAUDE.md`).

## Who we build for
1. **Business buyers (priority):** restaurants, cafés, hotels (tableware), companies (gifts, logo mugs, corporate clay workshops), agencies.
2. **Traffic engine:** people looking for a master class, pottery date, kids' class or gift certificate in their city. Every such page also points to business offers.
3. **Studios and makers:** free profile; they pay 10% only from orders that happened.

## Rules for every page
- **Request first:** «Отримати пропозиції» visible at the top, after the answer and at the end.
- **LLM-ready:** first 2–3 sentences are plain facts with numbers and a date; then a table; then details; then FAQ. schema.org JSON-LD (`src/components/site/JsonLd.tsx`), clean headings, «Оновлено» date. No thin pages: list pages need ≥3 real entries; the one exception is an oblast centre's city page, which covers the whole oblast («Тернопіль і область», `cityPages` in `src/lib/catalog.ts`) and stays with one or two.
- **Titles:** key words first, comma-separated, then « · Глина» (layout template); target ≤ 70 characters, brand dropped first (`fitTitle` in `src/lib/title.ts`); hand-written titles ≤ 62. Details and lists go to the description, not the title. Studios show `displayName(s)` (short name, `src/lib/present.ts`); slugs come from the short name. `node scripts/check-links.mjs` warns over 70 and fails over 100 or on shared titles.
- **Design:** `docs/design/SYSTEM.md` is the single source for tokens, type, components and page templates; new primitives go there and into `/dev/styleguide`; never reintroduce palette 1A.
- **Honest:** only collected data; never invent studios, prices, cases, reviews. Say the model openly but briefly (`site.model` in `src/content/site.ts`). Don't publish the legal entity.
- **Clean:** `pnpm knip` (config `knip.json`) must report nothing: delete dead files, exports and dependencies instead of leaving them; finished projects and superseded drafts go to `docs/archive/`, not next to live docs. Value lists, the slug rule and the owner photo limit live only in `src/shared/options.ts`; the public site URL is `site.url`.
- **Flexible wording:** no site-wide «від 30 штук»; minimum order lives in profiles. «Корпоратив з ліплення з глини».
- **Voice:** `docs/voice/README.md` — factual lead, then at most one short verse epigraph (`Epigraph`, `src/content/verses.ts`; none on pages where a business buys a batch), then warm, clear potters' prose. Never explain the verse.
- **Language:** Ukrainian only; English later via `/en` routes; never Russian.
- **Scope:** studio-scale ceramics made in Ukraine. Makers who now work abroad, suppliers, factories, media, course platforms and gift-certificate aggregators stay as drafts.
- **Photos:** only with the maker's consent, and always with their credit on the page (`StudioGallery`, `TopPhotos`; rules in `docs/decisions.md` 2026-10-19); stock photos (`public/images/stock`, CC0) only for site chrome.
- **Mobile first and fast:** server components by default, client components only for interaction, `next/image`, fonts self-hosted from committed files (`public/fonts`, rules in `src/app/fonts.css`; the build never downloads them).
- **No paid services** without the owner's explicit approval. No GitHub Actions/CI (paid minutes) — checks run locally (Stop hook, `pnpm lint`, `pnpm knip`, `pnpm test:int`, `pnpm build`).

## Stack
Next.js 16 (App Router) + Postgres (schema `app`, Drizzle ORM, Zod) + Better Auth (staff in `/panel`, studio owners in `/kabinet`) + Hono for `/api/panel` + Tailwind 4 with tokens by role from `docs/design/SYSTEM.md`, defined in `src/app/(frontend)/globals.css` (`bg-paper`, `text-ink`, `text-ink-2`, `bg-cobalt`, `text-terracotta-text`, `border-rule`, `font-display/body/serif/mono`); primitives in `src/components/ui/`. Fonts: Unbounded + Golos Text preloaded, Playfair Display italic + JetBrains Mono lazy (`src/app/fonts.ts`).

## Where things are
- `src/content/` — site facts (`site.ts`), navigation (`navigation.ts`) and curated lists (`linked.json`, `shop-makers.json`, `city-masters.json` — hidden makers' lines on city pages). Copy and menus are edited here, by an LLM.
- `src/components/site/` — header, mega menu, footer, request form, JSON-LD.
- `src/app/(frontend)/` — public pages; `llms.txt`, `health`, `sitemap.xml` + `catalog-sitemap.xml` routes; `src/app/robots.ts` and `manifest.ts`.
- `src/server/` — data layer: `db/schema` (Drizzle, schema `app`), `services/*` (all writes: requests, claims, owner changes, studio editor, imports — each audited), `auth/` (Better Auth, guards), `api/panel.ts` (Hono), `telegram/` (bot client and buttons → same services), `publicCatalog.ts` + `publicShape.ts` (rows → the record shapes in `src/types/catalog.ts` that pages render).
- `src/app/(panel)/panel` + `src/components/panel/` — the admin panel (own layout and bundle; nothing of it loads on public pages, `scripts/check-bundles.mjs` enforces it).
- **Крамниця** (`/kramnytsia`): plan `docs/shop/PLAN.md`, design `docs/shop/DESIGN.md`; pages `src/app/(frontend)/kramnytsia/`, components `src/components/shop/`, copy `src/content/shop.ts`, cart `src/shop/`, reads `src/lib/shopData.ts`, orders `src/server/services/orders.ts`. Items and shop terms are edited only through `scripts/app/edit-items.ts` (JSON), photos and stock through `scripts/app/read-shops.ts`; buying is the primary action on shop pages (no request CTA there).
- `public/brand/` — logo kit (SVG/PNG/PDF, avatars, email signature; usage in its `README.md`), generated by `node scripts/brand/build.mjs`.
- `scripts/app/*` — data scripts (imports, tags, geocoding, fixes, invites); they refuse production without `PROD=1` and read research files from `RESEARCH_DIR` (default `../UkraineCeramics`). `scripts/snapshot.mjs` (page snapshots and diffs), `scripts/check-links.mjs`, `check-bundles.mjs`, `shots.mjs`, `smoke/*` (panel and cabinet click-throughs).
- `deploy/` — Docker Compose + Caddy on the owner's VPS, backups (`deploy/README.md`).

## Commands
- `pnpm dev` — site on http://localhost:3000, panel on /panel (local Postgres, `DATABASE_URL`; invite yourself with `USER_ID=<email> BASE=http://localhost:3000 pnpm exec tsx scripts/app/invite.ts`).
- `pnpm shots /path` — screenshots to `.shots/` (dev server must run). Look once per finished screen.
- `pnpm exec tsx scripts/app/check-data.ts` — read-only data check (heritage/legacy, birthplace written as a workplace, Instagram links); run it after an edits file, an import or a copy sync, before data goes to production.
- Schema changes: edit `src/server/db/schema`, `pnpm db:generate`, review the SQL in `drizzle/`, commit; apply with `pnpm db:migrate` (see deploy/README.md). `pnpm exec tsc --noEmit` before finishing (the Stop hook runs it).
- `pnpm build` — production build (needs the database reachable).
- `pnpm test:int` uses one shared test database (`hlyna_apptest`): sessions run it one at a time; a deadlock or a vanished test user means another run overlapped, so rerun before suspecting the code.
- Deploy and production data edits: only with the owner, step by step in `deploy/README.md` («Deploy from the Mac»).

## How to work
Act when you have enough information; recommend rather than list options. Prefer the better solution for the goals over the easiest one, but don't add abstractions the task doesn't need. Commit in small steps with clear messages; never push or deploy without the owner. Verify with a command or a screenshot before saying something works.
