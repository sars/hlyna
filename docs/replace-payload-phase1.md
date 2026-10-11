# Replace Payload — phase 1 (foundation): what exists and how to run it

Branch `replace-payload/phase1`. Nothing on the public site or in the Payload config changed; the new schema lives
next to Payload's tables in Postgres schema `app`.

## Pieces
- `src/shared/options.ts` — value lists (types, formats, statuses) shared by the DB enums and Zod.
- `src/server/db/schema/*` — Drizzle schema in `pgSchema('app')`: cities, studios (wide row + `text[]` lists),
  studio_prices, studio_photos, studio_slug_history, media (variants jsonb), requests (+ `commission_kop` generated
  column), request_studios, claims, claim_studios, Better Auth tables (user with username plugin + role/lockout,
  session, account, verification, rate_limit), studio_owner, invite_links, studio_revisions, audit_log,
  change_sets (one pending per studio), jobs, import_runs. `src/server/db/index.ts` — pool + drizzle client.
- `drizzle/0000_init_app_schema.sql` — generated, reviewed, committed. `pnpm db:migrate` applies it.
- `src/server/legacy.ts` — maps `app` rows back to Payload's document shape (`toLegacyStudio` etc.); the verifier
  uses it now, the public catalog uses it in phase 3 so pages don't change.
- `scripts/migrate-from-payload.ts` (`pnpm migrate:payload`) — idempotent copy `public.*` → `app.*` in one transaction,
  ids preserved, sequences reset; report in `MIGRATION_REPORT` (default `migration-report.json`).
- `scripts/verify-migration.ts` (`pnpm verify:migration`) — Payload Local API vs `app` field by field for every
  studio, city, request, claim, owner, admin, plus version/revision counts. `PAYLOAD_MIGRATING=true` keeps Payload
  read-only (no dev schema push, no migrations). `DRAFT_LAB=1 VERIFY_ALLOW_WRITE=1` runs the drafts experiment on a
  scratch copy.
- `src/shared/schemas/index.ts` — Zod: `requestCreate`, `claimCreate`, `ownerStudioEdit` (the owner whitelist),
  `studioEdit`, `cityEdit`, `requestStatusChange`, `claimDecision`; tests in `tests/int/schemas.int.spec.ts`.

## Rehearsal on a prod copy
```
ssh hlyna "cd /opt/hlyna && docker compose exec -T db pg_dump -U hlyna --no-owner --no-privileges hlyna" > prod.sql
createdb hlyna_prodcopy && psql -q -d hlyna_prodcopy -f prod.sql
DATABASE_URL=postgres://localhost/hlyna_prodcopy pnpm db:migrate
DATABASE_URL=postgres://localhost/hlyna_prodcopy pnpm migrate:payload
DATABASE_URL=postgres://localhost/hlyna_prodcopy PAYLOAD_SECRET=x NODE_ENV=development pnpm verify:migration
```

## Results (2026-10-11)
| DB | studios | public | prices | services | products | formats | versions → revisions | requests | claims | owners | mismatches |
|---|---|---|---|---|---|---|---|---|---|---|---|
| prod copy | 815 | 488 | 1 728 | 2 539 | 2 620 | 920 | 6 002 | 2 | 1 | 1 | 0 |
| local copy | 815 | 488 | 1 728 | 2 539 | 2 620 | 920 | 6 728 | 1 | 0 | 0 | 0 |
32 600 studio fields compared on each; migrator run twice per DB (idempotent).

## Decisions and findings
- **Drafts of published studios (design §6.2 open question): confirmed.** Saving `draft: true` on a published
  studio leaves the main row untouched (owner_about, pending_owner_changes, updated_at unchanged); the change exists
  only in the latest `_studios_v` row (`version__status = draft`, `latest = true`), and `find` without `draft` still
  returns the published data. So the migrator turns each such draft into one pending `change_set` whose `proposed`
  holds only the owner fields that differ from the published row (Payload's draft defaults — false checkboxes, ''
  texts — count as unset). Prod and local have 0 such drafts today; the lab copy had 1 and it migrated as
  `{ownerAbout}` only. `pending_owner_changes` on the main row is never true in practice (it's set inside drafts),
  so it isn't a reliable signal — the new model derives it from `change_sets`.
- Activity/consent/geo timestamps stay `timestamptz` (the design said `date` for `activity_last_post_date`; that would
  drop the time Payload stores).
- Payload returns `null` for empty localized arrays (services, products) and `[]` for the others; the verifier treats
  both as empty.
- Owners become Better Auth users `owner_<id>` (admins `admin_<id>`), `legacy_id` keeps the Payload id. Owner
  passwords move as their `scrypt$salt$key` hash into `account.password`; unused, unexpired invite tokens move to
  `invite_links` with the same hash, so links already sent keep working (no re-send needed). The Payload admin
  (pbkdf2) gets a new invite link after cutover, as designed.
- No `server-only` import in `src/server/db` yet: scripts run under tsx, where that package throws. Phase 2 adds it
  to the entry points used by Next.
- Drizzle's migration journal lives in schema `drizzle` (default); harmless next to `app`.
