#!/bin/sh
# Daily access-log digest on the server (owner, 18.10.2026): reads Caddy's logs from the hlyna_caddy_data volume
# (read-only) and keeps a permanent archive and per-day digests in /opt/hlyna-logs, outside the deployed tree, so
# deploys never touch it and nothing there is deleted (Caddy itself drops logs after ~60 days).
# Runs scripts/logs/digest.mjs with the app image's Node; no Node on the host. Manual run: sudo deploy/logs-digest.sh
set -eu
OUT=${LOGS_DIR:-/opt/hlyna-logs}
mkdir -p "$OUT"
exec docker run --rm --user 0 --entrypoint sh \
  -v hlyna_caddy_data:/data:ro \
  -v "$OUT":/out \
  -v /opt/hlyna/scripts/logs:/app:ro \
  -e LOGS_DIR=/out \
  hlyna-app:latest \
  -c 'set --; for f in /data/access/*.gz /data/access/hlyna.log; do [ -e "$f" ] && set -- "$@" --file "$f"; done; exec node /app/digest.mjs "$@"'
