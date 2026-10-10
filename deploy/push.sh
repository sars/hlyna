#!/usr/bin/env bash
# Deploy from this Mac: ships the committed HEAD to the VPS (ssh alias `hlyna`), rebuilds, refreshes pages.
#   bash deploy/push.sh
set -euo pipefail
git diff --quiet HEAD || { echo "Commit your changes first."; exit 1; }
git archive --format=tar HEAD | ssh hlyna "tar -x -C /opt/hlyna"
ssh hlyna 'cd /opt/hlyna && docker compose up -d --build && sleep 15 && curl -sf -o /dev/null http://localhost:80/health -H "Host: 89.116.24.123" \
  && S=$(grep ^REVALIDATE_SECRET= .env | cut -d= -f2) && curl -s -X POST "http://localhost:80/revalidate?secret=$S" -H "Host: 89.116.24.123" && echo && docker image prune -f >/dev/null'
echo "Deployed $(git rev-parse --short HEAD)"
