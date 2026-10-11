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

## Remaining (next milestones)
- **Студії**: list (search, filters, keyset `PagedList`) and the full editor (all sections, lists, prices with dates,
  formats, b2b, contacts, address + geocode + map preview, photos with alt/order/consent, Instagram posts, alternate
  names, status/visibility, slug with 301 history), revision history with diff and restore, version conflict (409).
- **Міста**, **Медіа** (upload with sharp variants and EXIF strip, alt, orphans), **Користувачі** (staff + owners,
  invites, roles, deactivate, studio grants, sessions), **Instagram** status (import_runs, freshness, queue CSV).
- Kabinet writes → `change_sets` (phase 3 switch), public pages → new data layer, then cutover and Payload removal.
