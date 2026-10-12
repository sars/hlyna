#!/usr/bin/env bash
# Deploy from this Mac: ships the committed HEAD to the VPS (ssh alias `hlyna`), rebuilds, refreshes pages.
#   bash deploy/push.sh
set -euo pipefail
git diff --quiet HEAD || { echo "Commit your changes first."; exit 1; }

# Never ship a HEAD that lacks code already on GitHub or already live: several sessions deploy from different
# checkouts, and a deploy replaces the whole server tree (2026-10-12 one undid another session's live commits).
# FORCE_DEPLOY=1 skips both checks (a deliberate rollback).
HEAD_SHA="$(git rev-parse HEAD)"
if [ "${FORCE_DEPLOY:-}" != 1 ]; then
  git fetch -q origin main
  git merge-base --is-ancestor origin/main HEAD || {
    echo "origin/main has commits this HEAD does not: merge them first (git merge origin/main)."
    git log --oneline HEAD..origin/main | head -10
    exit 1
  }
  LIVE="$(ssh hlyna 'cat /opt/hlyna/.deployed-commit 2>/dev/null || true')"
  if [ -n "$LIVE" ]; then
    git cat-file -e "$LIVE^{commit}" 2>/dev/null || { echo "The live commit $LIVE is not in this repository: fetch or merge the checkout it came from."; exit 1; }
    git merge-base --is-ancestor "$LIVE" HEAD || { echo "The live commit $LIVE is not part of this HEAD: merge it first."; exit 1; }
  fi
fi
# Code folders are replaced, not merged, so files deleted in git do not linger on the server (and break the build).
git archive --format=tar HEAD | ssh hlyna "cd /opt/hlyna && rm -rf src scripts tests docs public && tar -x -C /opt/hlyna"
# The script goes to the server on stdin, so every command in it that could read stdin gets </dev/null:
# otherwise it swallows the rest of the script and the steps after it silently never run.
ssh hlyna 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/hlyna
# The build pre-renders every page from the live database (Dockerfile): it reaches the db container by IP over the
# host network, with the URL passed as a build secret. The old app keeps serving until the new image is ready.
DB_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$(docker compose ps -q db)")"
export BUILD_DATABASE_URL="postgres://hlyna:$(grep ^POSTGRES_PASSWORD= .env | cut -d= -f2-)@${DB_IP}:5432/hlyna"
docker compose up -d --build </dev/null
sleep 15
docker compose exec -T caddy cat /etc/caddy/Caddyfile </dev/null | cmp -s - Caddyfile || docker compose restart caddy </dev/null
sleep 3
curl -sf -o /dev/null --resolve hlyna.com.ua:443:127.0.0.1 https://hlyna.com.ua/health
# Pick up edits made while the image was building (stale-while-revalidate: readers never wait).
S="$(grep ^REVALIDATE_SECRET= .env | cut -d= -f2)"
curl -sf -X POST --resolve hlyna.com.ua:443:127.0.0.1 "https://hlyna.com.ua/revalidate?secret=$S" </dev/null && echo
docker image prune -f >/dev/null </dev/null
echo "remote steps done"
REMOTE
ssh hlyna "echo $HEAD_SHA > /opt/hlyna/.deployed-commit"
echo "Deployed $(git rev-parse --short HEAD)"
