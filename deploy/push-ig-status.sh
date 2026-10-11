#!/usr/bin/env bash
# Upload the Instagram refresh status to the server for /panel/instagram (the server can't see the scanner's files).
# Run by the hourly refresh after syncing from the radar server.
#   bash deploy/push-ig-status.sh
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
IG_STATUS_DIR="${IG_STATUS_DIR:-/Users/rodik/Claude/UkraineCeramics/09_instagram/posts_scan}" pnpm -s exec tsx scripts/app/ig-status-json.ts > "$TMP"
ssh hlyna "mkdir -p /opt/hlyna/ops/instagram"
scp -q "$TMP" hlyna:/opt/hlyna/ops/instagram/ig-status.json.tmp
ssh hlyna "mv /opt/hlyna/ops/instagram/ig-status.json.tmp /opt/hlyna/ops/instagram/ig-status.json"
echo "ig-status.json uploaded ($(wc -c < "$TMP") bytes)"
