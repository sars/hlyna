#!/usr/bin/env bash
# Restore the database (and optionally media) from a backup made by backup.sh.
#   deploy/restore.sh /var/backups/hlyna/db_2026-10-10_0300.dump [media_….tar.gz]
# Replaces the current database contents. Take a fresh backup first.
set -euo pipefail

DUMP="${1:?usage: restore.sh <db_*.dump> [media_*.tar.gz]}"
MEDIA="${2:-}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

[ -f "$DUMP" ] || { echo "no such file: $DUMP" >&2; exit 1; }
read -r -p "Replace the hlyna database with $DUMP? Type 'yes': " ok
[ "$ok" = yes ] || { echo "aborted"; exit 1; }

docker compose stop app
docker compose exec -T db pg_restore -U hlyna -d hlyna --clean --if-exists --no-owner < "$DUMP"

if [ -n "$MEDIA" ]; then
  docker compose run --rm -T --no-deps --entrypoint sh -u root app \
    -c 'rm -rf /app/public/media/* && tar -C /app/public -xzf - && chown -R 1001:1001 /app/public/media' < "$MEDIA"
fi

docker compose start app
echo "restored from $DUMP"
