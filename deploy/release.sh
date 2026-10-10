#!/usr/bin/env bash
# Update the live site: pull, build, restart, check.
#   deploy/release.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
URL="${HEALTH_URL:-https://hlyna.com.ua/}"
cd "$APP_DIR"

git pull --ff-only
docker compose build app
docker compose up -d
docker image prune -f >/dev/null

# Wait up to ~2 minutes for the app to answer through Caddy.
for i in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL" || true)"
  if [ "${code:0:1}" = 2 ] || [ "${code:0:1}" = 3 ]; then
    echo "release ok: $(git log -1 --format='%h %s') -> $URL $code"
    exit 0
  fi
  sleep 5
done
echo "health check failed: $URL answered '$code'" >&2
docker compose logs --tail 50 app >&2
exit 1
