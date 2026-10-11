#!/usr/bin/env bash
# Switch hlyna.com.ua from Payload to the new data store (schema `app`, Better Auth, /panel). Run from the Mac.
#
#   bash deploy/cutover.sh rehearse   fresh prod dump → local DB hlyna_rehearsal → migrate → copy → verify (timed)
#   bash deploy/cutover.sh run        the real switch (asks before each irreversible step)
#   bash deploy/cutover.sh rollback   back to Payload (flag flip + restart; see notes)
#
# What `run` does, in order:
#   1. preflight   clean git tree, server reachable, enough disk, the app healthy
#   2. backup      pg_dump of the whole database + tar of the media volume on the server (/var/backups/hlyna)
#   3. ship        deploy this commit with DATA_BACKEND unset (Payload still serves) and KABINET_FROZEN=1
#                  (owner saves pause; the request form keeps working)
#   4. migrate     drizzle migrations for schema app, then copy Payload → app (scripts/migrate-from-payload.ts)
#   5. verify      field-by-field check against Payload's own output (read-only; stops on any mismatch)
#   6. switch      DATA_BACKEND=app, KABINET_FROZEN removed, app restarted
#   7. smoke       key pages, panel and cabinet sign-in pages, media, request endpoint (honeypot, nothing saved)
# The DB steps run on this Mac through an SSH tunnel with PROD=1; they never boot Payload with NODE_ENV=production
# (that would run pending Payload migrations) — verify runs with NODE_ENV=development PAYLOAD_MIGRATING=true.
#
# Rollback: DATA_BACKEND unset → Payload serves again from its untouched tables. Anything written through the new
# stack after the switch (panel edits, owner changes, new requests) lives only in app.* and is not visible to Payload:
# export it from the audit log before rolling back. A full restore from the backup is documented in
# docs/replace-payload-cutover.md.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"
TS=$(date +%Y%m%d-%H%M%S)
LOG="cutover-$MODE-$TS.log"
SECONDS=0
step() { printf '\n== %s  (+%ss)\n' "$1" "$SECONDS" | tee -a "$LOG"; }
ask() { [ "${YES:-}" = 1 ] && return 0; read -r -p "$1 [y/N] " a; [ "$a" = y ]; }
setenv() { # setenv KEY VALUE|-  on the server .env (- removes the key)
  ssh hlyna "cd /opt/hlyna && sed -i '/^$1=/d' .env && { [ '$2' = '-' ] || echo '$1=$2' >> .env; }"
}
restart_app() { ssh hlyna 'cd /opt/hlyna && docker compose up -d --force-recreate app >/dev/null && for i in $(seq 1 40); do curl -sf -o /dev/null --resolve hlyna.com.ua:443:127.0.0.1 https://hlyna.com.ua/health && exit 0; sleep 3; done; echo "app not healthy"; exit 1'; }

tunnel_open() {
  ssh -N -L 15432:"$(ssh hlyna "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' hlyna-db-1")":5432 hlyna &
  TUNNEL=$!
  sleep 3
  PW=$(ssh hlyna "grep '^POSTGRES_PASSWORD=' /opt/hlyna/.env | cut -d= -f2-")
  export PROD_URL="postgres://hlyna:${PW}@127.0.0.1:15432/hlyna"
}
tunnel_close() { [ -n "${TUNNEL:-}" ] && kill "$TUNNEL" 2>/dev/null || true; }
trap tunnel_close EXIT

db_steps() { # db_steps URL PROD(0|1)
  local url="$1" prod="$2"
  step "drizzle migrations (schema app)"
  DATABASE_URL="$url" pnpm -s exec drizzle-kit migrate 2>&1 | tail -2 | tee -a "$LOG"
  step "copy Payload → app"
  DATABASE_URL="$url" PROD="$prod" MIGRATION_REPORT="migration-report-$TS.json" pnpm -s exec tsx scripts/migrate-from-payload.ts 2>&1 | tail -5 | tee -a "$LOG"
  step "verify (read-only)"
  DATABASE_URL="$url" NODE_ENV=development PAYLOAD_MIGRATING=true PAYLOAD_SECRET="${PAYLOAD_SECRET:-verify-only}" VERIFY_REPORT="verify-report-$TS.json" \
    pnpm -s exec cross-env NODE_OPTIONS=--no-deprecation payload run scripts/verify-migration.ts 2>&1 | grep -v Pulling | tail -8 | tee -a "$LOG"
}

smoke() { # smoke BASE_RESOLVE
  step "smoke"
  local fail=0 code
  for path in / /vyrobnyky /maister-klasy/kyiv /dlya-biznesu /mapa /tsiny-2026 /kabinet/vhid /panel/vhid /health; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --resolve hlyna.com.ua:443:89.116.24.123 "https://hlyna.com.ua$path")
    echo "$code $path" | tee -a "$LOG"; [ "$code" = 200 ] || fail=1
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' --resolve hlyna.com.ua:443:89.116.24.123 -X POST -H 'Content-Type: application/json' -d '{"what":"other","contactEmail":"a@b.ua","website2":"smoke"}' https://hlyna.com.ua/api/zapyt)
  echo "$code POST /api/zapyt (honeypot, expect 400)" | tee -a "$LOG"; [ "$code" = 400 ] || fail=1
  return $fail
}

case "$MODE" in
rehearse)
  step "fresh prod dump (read-only on the server)"
  ssh hlyna "cd /opt/hlyna && docker compose exec -T db pg_dump -U hlyna -Fc hlyna" > "/tmp/hlyna-rehearsal-$TS.dump"
  ls -lh "/tmp/hlyna-rehearsal-$TS.dump" | tee -a "$LOG"
  step "restore into local hlyna_rehearsal"
  dropdb --if-exists hlyna_rehearsal && createdb hlyna_rehearsal
  pg_restore --no-owner --no-privileges -d hlyna_rehearsal "/tmp/hlyna-rehearsal-$TS.dump" 2>&1 | tail -3 | tee -a "$LOG" || true
  db_steps postgres://localhost/hlyna_rehearsal 0
  step "done — now run the panel and cabinet smoke against hlyna_rehearsal (docs/replace-payload-cutover.md)"
  echo "total ${SECONDS}s" | tee -a "$LOG"
  ;;
run)
  step "preflight"
  git diff --quiet HEAD || { echo "Commit your changes first."; exit 1; }
  ssh hlyna 'df -h / | tail -1; cd /opt/hlyna && docker compose ps --format "{{.Service}} {{.Status}}"' | tee -a "$LOG"
  ask "Start the cutover of $(git rev-parse --short HEAD)?" || exit 1
  step "backup"
  ssh hlyna "mkdir -p /var/backups/hlyna && cd /opt/hlyna && docker compose exec -T db pg_dump -U hlyna -Fc hlyna > /var/backups/hlyna/pre-cutover-$TS.dump && docker run --rm -v hlyna_media:/m:ro -v /var/backups/hlyna:/b alpine tar czf /b/media-pre-cutover-$TS.tgz -C /m . && ls -lh /var/backups/hlyna/*$TS*" | tee -a "$LOG"
  step "ship (Payload still serving, cabinet saves frozen)"
  setenv DATA_BACKEND -
  setenv KABINET_FROZEN 1
  bash deploy/push.sh 2>&1 | tail -3 | tee -a "$LOG"
  tunnel_open
  db_steps "$PROD_URL" 1
  tunnel_close
  ask "Verification is above. Switch the site to the new data store?" || { setenv KABINET_FROZEN -; restart_app; echo "Stopped before the switch; Payload still serves."; exit 1; }
  step "switch"
  setenv DATA_BACKEND app
  setenv KABINET_FROZEN -
  restart_app
  if smoke; then
    step "cutover done in ${SECONDS}s — watch the logs: ssh hlyna 'cd /opt/hlyna && docker compose logs -f app'"
  else
    echo "Smoke failed." | tee -a "$LOG"
    ask "Roll back to Payload now?" && { setenv DATA_BACKEND -; restart_app; echo "Rolled back."; }
    exit 1
  fi
  ;;
rollback)
  ask "Roll back to Payload (DATA_BACKEND unset)? Writes made through the new stack stay only in app.*" || exit 1
  setenv DATA_BACKEND -
  setenv KABINET_FROZEN -
  restart_app
  smoke || true
  ;;
*)
  sed -n '2,8p' "$0"; exit 1 ;;
esac
