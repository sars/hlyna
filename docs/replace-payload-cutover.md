# Replace Payload: milestone 3 and the cutover runbook

Milestone 3 moves everything except the public pages onto the new stack, behind one switch: `DATA_BACKEND=app`
in the server `.env`. Unset (today) = Payload. The public pages switch in the next step, after main's refactor lands
and this branch is rebased; **the real cutover waits for that** (otherwise panel edits would not reach public pages).

## What switches with `DATA_BACKEND=app`
- **Cabinet** (`/kabinet`): Better Auth owner sessions (`hlyna.session_token`); owners' saves become the studio's
  one pending `change_set` (field-level), new photos are `media.status='pending'` until we accept them in the panel.
  Pages read through `src/lib/kabinetData.ts`; the forms and markup are unchanged — screenshots of
  `/kabinet/vhid`, `/kabinet/parol`, `/kabinet/zayavka`, `/zapyt`, `/zapyt?vid=studiya` at 1280 and 390 px are
  pixel-identical on both backends (`scripts/smoke/compare-backends.mjs`).
- **Request form** (incl. «Додати студію») posts to `/api/zapyt` on both backends (response `{ok, id}` and the old
  `doc.id`); on the app backend it goes through `submitRequest` (Zod, honeypot, 10/hour per IP in Postgres,
  the same Telegram text and buttons). **Claim form** → `submitClaim` (5/hour per IP).
- **Telegram webhook**: the Payload-era handler stays in `src/lib/telegramLegacyWebhook.ts` for `DATA_BACKEND` unset;
  with `app` the panel services answer the buttons.
- **Owner saves freeze** with `KABINET_FROZEN=1` (503 with a friendly message) during the switch.

## Import scripts on the new stack (`scripts/app/*`, run with `pnpm exec tsx`)
`import-ig`, `import-ig-highlights`, `tag-studios`, `alt-names`, `geocode` (SLUGS/FORCE), `address-from-text`
(DRY then SLUGS), `set-status` (public/hidden), `apply-fixes`, plus `invite` (one-time link) and `ig-status-json`.
- Drizzle only — **no Payload is booted**, so a script can never apply a schema migration.
- **Refuse production unless `PROD=1`**: NODE_ENV=production, the tunnel port 15432, host `db`, or HLYNA_ENV=prod.
- Each write is one studio revision + audit entry (`source: script:<name>`); each run is a row in `app.import_runs`
  (shown on /panel/instagram); studios with an owner's pending change set are skipped.
- Optional `SITE_URL` + `REVALIDATE_SECRET` → one revalidation at the end.
- Same rules as the Payload versions (tests in `tests/int/m3-services.int.spec.ts`). The geocoder is the shared
  `src/server/geo/nominatim.ts`; its cache entries are now prefixed `rows:` so they don't clash with the old
  script format in the same cache file.
- The Payload versions in `scripts/*.ts` keep working until cutover; after it, use only `scripts/app/*`.
- `verify-migration` refuses `NODE_ENV=production` or a missing `PAYLOAD_MIGRATING=true` (read-only only).
  `migrate-from-payload` needs `PROD=1` for production and refuses to refill `app.*` once the panel, cabinet or
  Telegram wrote anything (`ALLOW_WIPE=1` overrides).

## Media and Instagram status (in this branch, harmless before the switch)
- **Caddy** serves `/media/*` straight from the media volume (mounted read-only into caddy) and answers
  `/api/media/file/*` with a 301 to `/media/*` — same files, same names. `src/app/media/[file]` serves them for
  local runs without Caddy.
- **Instagram status**: the hourly job runs `bash deploy/push-ig-status.sh` after syncing; it uploads
  `ops/instagram/ig-status.json` (mounted into the app at `/app/ops/instagram`, `IG_STATUS_DIR`).
- **Old slugs**: 301s for renamed studios and cities belong to the public-pages step (studio_slug_history,
  city_slug_history are ready).

## Rehearsal (2026-10-11, fresh prod dump → local `hlyna_rehearsal`)
`bash deploy/cutover.sh rehearse`:

| Step | Time |
|---|---|
| pg_dump on the server (4.7 MB) | 2 s |
| restore locally | 4 s |
| drizzle migrations (app) | 1 s |
| copy Payload → app | 2 s |
| verify (32 600 studio fields, 815 studios, 144 cities, 2 requests, 1 claim, 1 owner, 1 admin, 6 225 versions) | 5 s, no mismatches |
| **total** | **14 s** |

Then on a dev server with `DATA_BACKEND=app` against `hlyna_rehearsal`:
- **Cabinet smoke** (`scripts/smoke/kabinet.mjs`): owner invite → set password → cabinet (both «Осоння» studios)
  → edit «Що нового», a price, a photo with alt → saved as a pending change set with a pending photo → sign out →
  wrong password (refused) → sign in → phone views without horizontal scroll → claim form saved → request form
  saved. **OK.**
- **Panel smoke** (`scripts/smoke/panel.mjs`): admin invite → set password → sign-in → overview, requests, claims,
  changes, journal at 1280 and 390 px. **OK** (only the deliberate wrong-password 401 and Playwright's known
  hydration note).
- Found and fixed during the rehearsal: re-uploading the same photo listed it twice in the proposal (duplicate media
  row by sha256) — now deduplicated, also when shown.
- Production build: 3 min 07 s on the Mac; bundle check: 107 route manifests, no panel/API client code on public pages.

## Cutover runbook (`bash deploy/cutover.sh run`)
Preflight → backup (pg_dump + media tar in `/var/backups/hlyna`) → ship this commit with Payload still serving and
`KABINET_FROZEN=1` → drizzle migrations + copy + verify through an SSH tunnel (`PROD=1`, verify read-only) →
confirm → `DATA_BACKEND=app`, unfreeze, restart → smoke (key pages, /kabinet/vhid, /panel/vhid, /api/zapyt honeypot
= 400). On a failed smoke it offers the rollback. Expected downtime: none for readers; owner saves paused for the
migration window (~1 minute of DB work plus the deploy build).

After the switch:
1. `USER_ID=admin_1 BASE=https://hlyna.com.ua PROD=1 DATABASE_URL=<tunnel> pnpm exec tsx scripts/app/invite.ts`
   → Rodion sets the panel password (staff passwords don't migrate; owners keep theirs).
2. Hourly job: switch to `scripts/app/*` and add `deploy/push-ig-status.sh`.
3. Watch logs and the journal for a day; then the removal phase (Payload collections, admin, config, migrations,
   dependencies, `lib/ownerAuth`, `lib/kabinet`, `lib/telegramLegacyWebhook.ts`, `scripts/*.ts` Payload versions).

**Rollback** (`bash deploy/cutover.sh rollback`): `DATA_BACKEND` unset → Payload serves from its untouched tables.
Writes made through the new stack after the switch exist only in `app.*` (see the journal) and must be re-entered.
Full restore if ever needed: `pg_restore --clean -d hlyna /var/backups/hlyna/pre-cutover-<ts>.dump` inside the db
container, and the media tar back into the volume.

## Remaining before the real cutover
1. **Public pages on the new data layer** (after main's refactor lands; rebase this branch first): replace the
   Payload Local API reads in `src/lib/catalog.ts` and pages with Drizzle (the mapper `src/server/legacy.ts` keeps the
   old document shape), studios' `/kabinet/api/studios` search, sitemap and llms.txt; 301s for old studio and city
   slugs; `/media/*` URLs in pages; full-site snapshot diff = 0 on both backends.
2. Merge the branch to main **with `DATA_BACKEND` unset** (prod keeps running on Payload), deploy, check nothing
   changed (snapshot diff on prod).
3. Rehearse once more on a fresh dump, then `deploy/cutover.sh run`.
4. Removal phase.
