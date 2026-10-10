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
