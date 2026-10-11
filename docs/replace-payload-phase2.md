# Replacing Payload, phase 2: Better Auth

Branch `replace-payload/phase2` (on top of phase 1). Adds one sign-in system for staff (`admin`, `editor` → /panel)
and studio owners (`owner` → /kabinet) next to the current site; nothing on main uses it yet.

## What's in place
- `src/server/auth/index.ts`: `createAuth()` / `getAuth()` — Better Auth **1.7.5** (pinned, as in the starter kit),
  Drizzle adapter on schema `app`, `basePath /api/auth`, cookie `hlyna.session_token` (httpOnly, sameSite=lax, secure in prod).
  - No sign-up, no e-mail: `disabledPaths` closes sign-up, password reset by e-mail, update/delete user, username lookup.
  - `username` plugin: owners log in with an email or a phone in any spelling (`normalizeLogin`); phone logins keep the
    synthetic email `<id>@owners.hlyna.invalid`.
  - Passwords use our `scrypt$salt$key` (`password.ts`), so owners keep their passwords from the old /kabinet.
  - Sessions: staff 7 days, owners 30 days, renewed after a day of use; no cookie cache, so revocation is immediate.
  - Lockout: 5 wrong passwords lock the account for 15 minutes; switched-off accounts can't sign in (hooks).
  - Rate limit in Postgres (`app.rate_limit`): 3 sign-in attempts / 10 s per client address (Caddy's `X-Forwarded-For`).
- `invites.ts`: one-time set-password links (`/kabinet/parol?token=` for owners, `/panel/parol?token=` for staff), 7 days,
  SHA-256 of the token stored; a new link replaces the older one; using a link sets login + password and ends old sessions.
  Links issued by the old /kabinet keep working (same hash).
- `users.ts`: create users (no public sign-up), grant/revoke studios, switch accounts off (sessions end at once).
- `access.ts` (framework-free) and `guards.ts` (`server-only`, bound to the app): `currentUser`, `requireRole(editor|admin)`,
  `requireOwner`, `requireOwnerOf(studioId)` (staff pass too), `panelUserOrRedirect`, `ownerOrRedirect`, `withAuthErrors`.
- `kabinet-adapter.ts`: what /kabinet needs (owner/staff sign-in, sign-out, invite details, set password + sign in,
  current owner with studios), for the phase-3 switch.
- `src/app/api/auth/[...all]/route.ts`: the Better Auth endpoints.
- ESLint: public pages (`(frontend)` except `/kabinet`, `components/site`) may not import `better-auth/react|client`,
  panel UI or `server/auth` — the catalogue ships no auth JS.
- Migration `drizzle/0001_auth_rate_limit_bigint.sql`: `rate_limit.last_request` is epoch ms, so bigint (phase-1 schema bug).

## Env
`BETTER_AUTH_SECRET` (openssl rand -hex 32) and optionally `BETTER_AUTH_URL` (defaults to `NEXT_PUBLIC_SERVER_URL`).

## Tests
`tests/int/auth.int.spec.ts`, real Postgres (`AUTH_TEST_DATABASE_URL`, default `postgres://localhost/hlyna_apptest`):
old-hash sign-in, phone spellings, lockout and reset, switched-off accounts, session lengths by role, closed endpoints,
invite single use / expiry / replacement / taken login / legacy link / sessions ended, role and owner-of guards,
immediate role change, DB rate limit. Verified on `hlyna_prodcopy`: the migrated «Осоння» owner gets a link, sets a
test-only password, signs in, and passes `requireOwnerOf` for its studio.
