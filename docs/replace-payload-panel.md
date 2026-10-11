# Replace Payload: /panel (milestone 1)

Branch `replace-payload/panel` (from `replace-payload/phase2`). Design: `docs/replace-payload-design.md` §4.

## What is built
- **Bundle isolation.** `src/app/(panel)/panel/layout.tsx` is its own root layout with its own stylesheet
  (`panel.css`, Tailwind scoped to `components/panel` with `source(none)`), Inter via `next/font`, noindex. The public
  stylesheet excludes the panel (`@source not` in `(frontend)/globals.css`). ESLint keeps panel, TanStack, Base UI,
  sonner, Hono and auth-client imports out of `(frontend)` and `components/site`, and keeps client UI under
  `components/panel/{ui,inhouse,shell,lib}` away from `src/server/{db,services,api}`. `scripts/check-bundles.mjs`
  (run after `next build`) fails if a public route's client manifest references panel or API client modules.
- **UI kit.** `components/panel/ui` (shadcn on Base UI) and `components/panel/inhouse` (PageHeader, KpiCard,
  StatusBadge, HistoryList, FilterBar/Field, Choice, ConfirmDialog, FormField, EmptyState, PagedList, Amount,
  RefreshButton) and `shell` (sidebar, phone tab bar, user menu, pull-to-refresh) are copied from
  brocoders/inhouse-ai-starter-kit (MIT, `components/panel/KIT-LICENSE`) and adapted for Next (next/link,
  usePathname, `router.refresh()` instead of a query-only invalidation). Text lives in `lib/uk.ts` (`t()`), numbers
  and dates in `lib/format.ts` (uk-UA, Europe/Kyiv). Tokens and rules follow the kit's DESIGN.md.
- **Services** (`src/server/services`), framework-free, used by the panel API, the Telegram webhook and tests:
  `requests` (list with filters and keyset paging, status, notes + deal amount → Postgres-computed 5 %, forwarding to
  studios), `claims` (approve → create or extend the owner, grant studios, mark them verified with a revision, one-time
  link + ready message; reject with reason; both idempotent), `changeSets` (normalise owner proposals incl. the legacy
  Payload-draft keys, field-level diff, apply selected / all-but-text with our own public description and quote
  approval in the same step, reject), `studios` (snapshot → `studio_revisions`, patch with audit, search),
  `overview` (KPIs, journal). Every write lands in `audit_log` with its source (`panel`, `telegram`, …).
- **API.** Hono at `/api/panel/*` (`src/server/api/panel.ts`, mounted by `src/app/api/panel/[[...route]]/route.ts`):
  same-origin check on writes, `requireRole('editor')`, Zod validation. The only public route is
  `POST /api/panel/auth/set-password` (one-time link).
- **Telegram.** `src/server/telegram/actions.ts` maps each button to the same services; the webhook route only parses
  updates and edits messages. Buttons link to `/panel/...`.
- **Screens.** `/panel/vhid` (sign-in, Better Auth email + password), `/panel/parol` (set password from a link),
  `/panel` (Огляд: queues, KPIs, catalogue gaps), `/panel/zapyty` (+ detail: one-tap status with optimistic update,
  contact links, forwarding to studios with search, notes, deal amount with live commission, history),
  `/panel/zayavky` (+ detail: verification hints against the studio's public contacts, attach to an existing owner,
  approve → link and message shown once with copy buttons, reject with reason), `/panel/zminy` (+ detail: field-by-field
  diff with accept checkboxes, owner text marked internal, our rewrite of the public description and «що нового»,
  quote approval, apply selected / all but text / reject; long removals collapse), `/panel/zhurnal` (audit log with
  entity filter and paging).

## Tests
- `tests/int/panel-services.int.spec.ts` (real Postgres `PANEL_TEST_DATABASE_URL`, default `hlyna_apptest`): request
  status idempotency and audit, commission in kopecks, forwarding order; claim approval (owner created, both studios
  granted and verified with a revision, one link, repeat is a no-op, attach to existing owner, reject blocks approval);
  change sets (legacy normalisation, partial apply keeps owner text internal and writes our description, revision,
  all-but-text, reject); Telegram taps through the same services (source `telegram`), «Опублікувати» asks first when
  owner text is present. Run the suite serially: `pnpm exec vitest run --no-file-parallelism` (the auth and panel
  suites truncate the same test database). `tests/int/api.int.spec.ts` is the old Payload template test and needs
  `PAYLOAD_SECRET`; it is not part of this work.
- Playwright smoke (`scripts/.panel-smoke*.mjs`, not committed, screenshots in `.shots/panel/`): set password from an
  invite, sign out, wrong password message, sign in, overview, requests filter/detail/status/notes, claims, approve a
  claim, review and apply an owner change set, journal — at 1280 px and 390 px, against `hlyna_prodcopy`.

## Milestone 2 (studios, cities, media, users, Instagram)
- **Студії** `/panel/studii`: search (name, other names, slug, Instagram) and filters (city, type, visibility, status,
  format, verified, has prices, has address on the map) in the URL, keyset paging by name. Editor `/panel/studii/<id>`
  in sections with a sticky section bar: Основне (slug change keeps the old slug in `studio_slug_history`), Тексти
  (voice hints, live counters, owner text shown read-only, quote approval), Послуги/Вироби/Ціни (drag on desktop,
  ↑/↓ on phones; price lines with source and date), Формати, Для бізнесу (yes / no / unknown), Контакти, Адреса
  («Знайти координати» through Nominatim with the shared cache; map preview loads MapLibre lazily inside the panel
  bundle, marker can be dragged; no WebGL → a sentence, coordinates stay editable), Фото (upload, alt, order, consent),
  Пости Instagram (≤3), Інші назви й джерела, Статус і показ. One save = one transaction: version check → row, prices,
  photos, slug history → `studio_revisions` + `audit_log` → public pages revalidated (`studios` tag + profile and city
  paths, `src/server/revalidate.ts`). A stale save gets 409 with the fields the other person changed (dialog: reload /
  save mine over it / stay). The first panel save of a studio stores its previous state as a `baseline` revision.
- **Історія** `/panel/studii/<id>/istoriia`: every revision with who/when/note, «Що змінилось» (diff against the previous
  revision, loaded on demand), «Відновити цю версію» = a new revision (never rewrites history; same version check).
  Migrated Payload-shaped snapshots are read through `normalizeSnapshot`.
- **Міста** `/panel/mista`: name, slug, oblast, locative («у Києві», migrated from `src/lib/present.ts`), population,
  >100k; creating; a slug rename stores the old slug in `city_slug_history` (migration `0002`) and
  `resolveCitySlug()` gives the current one — the public router must answer old slugs with a 301 at cutover.
- **Медіа** `/panel/media` and the editor's Фото: `src/server/media` re-encodes with orientation applied and no metadata
  (EXIF/GPS gone), makes Payload's seven sizes with Payload's names (`<name>-<w>x<h>.<ext>`), dedupes by SHA-256,
  requires alt, 8 MB limit, JPG/PNG/WebP. Files go to `MEDIA_DIR` (default `public/media`, the same volume). Delete is
  admin-only and refused while a profile shows the photo. URLs are `/media/<file>`: served by Next in dev; in production
  Caddy serves `/media/*` from the volume after cutover (design §5).
- **Користувачі** `/panel/korystuvachi` (admins only): owners and team tabs, search, access filter; new team member
  (email, role) or owner (contact, studios) → one-time link + ready message shown once; per person: new link, role
  admin↔editor (the last admin can't be demoted or switched off, nobody can switch themselves off), access on/off (off
  ends all sessions), owner studios (granting marks «підтверджено студією», removing the last owner unmarks), active
  sessions with device and IP, end one or all; history from the audit log.
- **Instagram** `/panel/instagram`: read-only status of both scanners (STATUS/STATUS_HL, STOPPED files, counts, recent
  log lines, `import_runs`) from `IG_STATUS_DIR` (default: the synced folder on Rodion's Mac). **In production the
  server can't read those files**: the hourly job must upload a small status JSON (or write `import_runs` rows through a
  script) — to do with the cutover.
- **Phone navigation**: four tabs (Огляд, Запити, Заявки, Студії) and «Ще» (sheet with the rest).
- **Bundle budget**: `scripts/check-bundles.mjs` now also fails if a panel screen's first-render client JS exceeds
  200 KB gzip. Current: 135–151 KB (the editor validates locally without zod; the server returns one readable
  sentence and the field on 400).
- **Found and fixed**: correlated subqueries written as `${table.id}` render as a bare `"id"` in single-table selects
  and bind to the subquery's own table. It made the overview's «без цін», claims' studio list and requests' «надіслано»
  counts wrong. All outer references are now fully qualified; a regression test covers it.

## Tests (milestone 2)
- `tests/int/panel-editor.int.spec.ts` (15): studio save/no-op/conflict/slug history/revision diff/restore (incl. a
  Payload-shaped revision)/list filters and paging; correlated counts; city rename; media sizes, EXIF stripped, dedupe,
  alt required, non-image refused, delete only when unused (files removed); users: staff invite and link replacement,
  owner studios and verified flag, deactivate ends sessions, last-admin guards, session revoke. Full suite serially:
  62 passed (the old Payload template test needs `PAYLOAD_SECRET`).
- Playwright smoke `scripts/.panel-smoke3.mjs` (not committed) against `hlyna_prodcopy` at 1280 and 390 px: list and
  filters, client + server validation, edit/reorder/price/format, geocode, photo upload, save, conflict from a second
  tab, history diff + restore, city edit/create/rename, media, new team member + invite + switch off, Instagram, phone
  editor, «Ще». No page errors (hydration warnings in the run come from Playwright's caret-hiding style on inputs).

## Remaining before cutover
Milestone 3 (cabinet on change sets, public forms, ported import scripts, Caddy /media, Instagram status upload,
release script and rehearsal) is done — see `docs/replace-payload-cutover.md`. What is left there: public pages on
the new data layer (after main's refactor lands), merge with `DATA_BACKEND` unset, a final rehearsal, the cutover,
and removing Payload.
