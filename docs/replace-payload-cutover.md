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

## Milestone 4: public pages on the new data layer (2026-10-11)
- `src/lib/catalog.ts` reads `src/server/publicCatalog.ts` when `DATA_BACKEND=app`: published studios in Payload's document shape (legacy mapper), sorted by name then id, with the fields Payload's anonymous read hides left out (ownerAbout, ownerNews, unapproved ownerQuote, consent, sources, sourceId, confidence, pendingOwnerChanges); empty localized arrays as `null` like Payload. Photos come from `/media/*` with photo consent. Sitemap, llms.txt, map GeoJSON, editorial builders and the studio search all go through the catalogue.
- Renamed studios and cities: profile, city, city×format and certificate pages 308 to the current slug from `studio_slug_history` / `city_slug_history` (`src/lib/redirects.ts`); no-op under Payload.
- Proof: fresh prod dump in `hlyna_m4`, app.* filled by migrate-from-payload; full snapshot (655 URLs) with `DATA_BACKEND` unset vs `=app`: 0 differences in status, title, description, canonical, OG, JSON-LD, text, links, headings, structure, classes; after merging /keysy, a focused snapshot of the 13 case/profile pages: 0 differences. Page weight on the app build equals today's (JS 189 KB gzip, home HTML 144 KB).

## Remaining cutover checklist
1. Merge `replace-payload/m4` into main with `DATA_BACKEND` unset; deploy; prod snapshot sample vs before = 0 diff; check-links.
2. Rehearse `deploy/cutover.sh rehearse` on a fresh prod dump (migrate, verify, both-backend snapshot diff, panel and cabinet smoke).
3. `deploy/cutover.sh run` (backup, freeze cabinet, migrate, verify, switch `DATA_BACKEND=app`, smoke, keep rollback ready); issue Rodion's panel invite (`scripts/app/invite.ts`); switch the hourly Instagram job to `scripts/app/*` + `push-ig-status.sh`.
4. After a stable week: remove Payload (collections, config, admin routes, `payload` deps, legacy kabinet auth and webhook), archive Payload tables to `payload_legacy`, drop after 30 days.

## Cutover record (2026-10-12, 01:10 Kyiv / 2026-10-11 22:10 UTC)
- Ran `YES=1 bash deploy/cutover.sh run` from a clean origin/main (`b76528c`) on Rodion's authorisation. Total 60 s.
- Backup: `/var/backups/hlyna/pre-cutover-20261012-011030.dump` (+ `media-pre-cutover-20261012-011030.tgz`).
- Verify: 815 studios, 32 600 studio fields, 144 cities, 2 requests, 1 claim, 1 owner, 1 admin, 6 353 versions — no mismatches.
- Gotcha: after the switch the catalogue data cache still held the empty build-time result, so list pages, the sitemap
  (60 URLs) and the map GeoJSON were empty while every page answered 200. A `/revalidate` fixed it at once.
  `smoke()` in `deploy/cutover.sh` now revalidates and fails if `catalog-sitemap.xml` has fewer than 600 URLs.
- After revalidation: full prod snapshot 660 pages vs `prod-before-cutover` = 0 differences in all 11 categories;
  link check 642 pages clean; Telegram webhook OK (no errors, 0 pending); no app errors in logs.
- Owner `owner_1` («Осоння», both studios) is active; it has no password yet (the studio never used its first link),
  so issue a fresh invite when they ask (`USER_ID=owner_1 … scripts/app/invite.ts`). Admin invite issued for Rodion.
- Payload stays installed (read-only fallback: `DATA_BACKEND` unset + restart) until removal after a stable week.

## Payload removal (2026-10-12, Rodion: «давай все зараз»)
Done the same night instead of after a stable week.

- **Backup first:** `/var/backups/hlyna/pre-payload-removal-20261012-012103.dump` (pg_dump -Fc, whole DB, 69 tables: 46 Payload in `public`, 23 in `app`; `pg_restore --list` checked) + `media-pre-payload-removal-20261012-012103.tgz` (empty volume, no photos yet). This dump is the only copy of the Payload tables — keep it.
- **Code:** Payload removed completely — collections, `payload.config.ts`, `payload-types.ts` (catalogue shapes kept in `src/types/catalog.ts`), the `(payload)` route group (`/admin`, REST, GraphQL), hooks/access/fields, Payload migrations, the legacy cabinet auth (`lib/kabinet.ts`, `lib/ownerAuth.ts`) and legacy Telegram handler, the `DATA_BACKEND` flag (the new stack is the only path), the Payload-booting scripts (`scripts/*.ts` → `scripts/app/*`), `migrate-from-payload` / `verify-migration` (git history only), `@payloadcms/*`, `payload`, `graphql`. `/admin` → 301 `/panel`. The Telegram webhook moved to `src/app/api/telegram/webhook` (same URL).
- **Database:** `deploy/sql/2026-10-12-drop-payload.sql` drops every `public` table and enum (reviewed list; nothing in `app`/`drizzle` depends on them; fails and rolls back if anything is left in `public`). Tested on a fresh prod dump before running on prod.
- **Verification:** tests (111), tsc, lint, production build, bundle check, a 60-URL sample covering every page type (local vs prod and prod before vs after), panel + cabinet smoke, webhook 403 without the secret, prod check-links.

**Rollback** (if ever needed): redeploy commit `d98065d` (the last code that still contains Payload, running with `DATA_BACKEND=app`) — `git checkout d98065d && bash deploy/push.sh` from a clean checkout — and, only if Payload itself must serve again, restore its tables from the dump:
`ssh hlyna 'cd /opt/hlyna && docker compose exec -T db pg_restore -U hlyna -d hlyna -n public --no-owner < /var/backups/hlyna/pre-payload-removal-20261012-012103.dump'`, then unset `DATA_BACKEND` in `.env` and restart the app. Anything written through the panel/cabinet after the cutover lives only in `app.*`.
