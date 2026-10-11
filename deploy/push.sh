#!/usr/bin/env bash
# Deploy from this Mac: ships the committed HEAD to the VPS (ssh alias `hlyna`), rebuilds, refreshes pages.
#   bash deploy/push.sh
set -euo pipefail
git diff --quiet HEAD || { echo "Commit your changes first."; exit 1; }
# Code folders are replaced, not merged, so files deleted in git do not linger on the server (and break the build).
git archive --format=tar HEAD | ssh hlyna "cd /opt/hlyna && rm -rf src scripts tests docs public && tar -x -C /opt/hlyna"
ssh hlyna 'cd /opt/hlyna && docker compose up -d --build && sleep 15 && { docker compose exec -T caddy cat /etc/caddy/Caddyfile | cmp -s - Caddyfile || docker compose restart caddy; sleep 3; } && curl -sf -o /dev/null --resolve hlyna.com.ua:443:127.0.0.1 https://hlyna.com.ua/health \
  && S=$(grep ^REVALIDATE_SECRET= .env | cut -d= -f2) && curl -s -X POST --resolve hlyna.com.ua:443:127.0.0.1 "https://hlyna.com.ua/revalidate?secret=$S" && echo && docker image prune -f >/dev/null'
echo "Deployed $(git rev-parse --short HEAD)"
