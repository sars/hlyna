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
