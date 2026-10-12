# Глина · hlyna.com.ua

Catalogue of Ukrainian handmade ceramics: studios, makers, master classes, prices, and a request form for
businesses. Live at https://hlyna.com.ua.

Start with [`AGENTS.md`](AGENTS.md) (rules, stack, where things are, commands), then
[`docs/STATUS.md`](docs/STATUS.md) (what is going on now) and [`docs/decisions.md`](docs/decisions.md) (why).

## Run it locally

```bash
cp .env.example .env            # local Postgres in DATABASE_URL
pnpm install
pnpm db:migrate                 # schema `app` (Drizzle migrations in drizzle/)
pnpm dev                        # http://localhost:3000, admin panel at /panel, studio cabinet at /kabinet
USER_ID=<your email> BASE=http://localhost:3000 pnpm exec tsx scripts/app/invite.ts   # one-time panel login link
```

Checks: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:int` (needs the database), `pnpm build`
(needs the database too), `node scripts/check-links.mjs` and `node scripts/snapshot.mjs` against a running server.

## Map

| Path | What |
|---|---|
| `src/app/(frontend)` | public pages, `llms.txt`, `health`, share cards (`/og`) |
| `src/app/(panel)`, `src/components/panel` | admin panel (own layout and bundle) |
| `src/app/api` | Better Auth, Hono `/api/panel`, request form, Telegram webhook |
| `src/server` | database schema (Drizzle, schema `app`), services (all writes, audited), auth, media |
| `src/lib`, `src/content`, `src/editorial` | page logic, site facts and copy, editorial page data |
| `src/components/site`, `src/components/ui` | site chrome and design primitives (`docs/design/SYSTEM.md`) |
| `scripts/app` | data scripts (imports, tags, geocoding); refuse production without `PROD=1` |
| `deploy` | Docker Compose + Caddy on the owner's VPS, backups, `push.sh` (`deploy/README.md`) |
| `docs` | status, decisions, design system, voice, reviews; `docs/archive` holds finished projects |
