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
# Every studio link in the copy (src/content, src/editorial) must be a published slug in the live catalogue: the
# renderer drops an unknown one silently (a link turns into plain text, a pick lands under the next studio's name).
# Checked against production through a short tunnel; SKIP_SLUG_CHECK=1 skips it (a deliberate rollback).
if [ "${SKIP_SLUG_CHECK:-}" != 1 ]; then
  DB_IP="$(ssh hlyna "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \$(cd /opt/hlyna && docker compose ps -q db)")"
  ssh -N -o ExitOnForwardFailure=yes -L 15433:"$DB_IP":5432 hlyna &
  TUNNEL_PID=$!
  trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT
  for _ in $(seq 40); do nc -z 127.0.0.1 15433 2>/dev/null && break; sleep 0.25; done
  PW="$(ssh hlyna 'grep ^POSTGRES_PASSWORD= /opt/hlyna/.env | cut -d= -f2-')"
  DATABASE_URL="postgres://hlyna:${PW}@127.0.0.1:15433/hlyna" pnpm exec tsx scripts/app/check-content-slugs.ts ||
    { echo "Fix the studio links above (or apply the data edits to production first), then deploy."; exit 1; }
  kill "$TUNNEL_PID" 2>/dev/null || true
  trap - EXIT
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
# HTTPS is the host's shared edge Caddy (/opt/edge); its Caddyfile is not part of this deploy.
curl -sf -o /dev/null --resolve hlyna.com.ua:443:127.0.0.1 https://hlyna.com.ua/health
# Pick up edits made while the image was building (stale-while-revalidate: readers never wait).
S="$(grep ^REVALIDATE_SECRET= .env | cut -d= -f2)"
curl -sf -X POST --resolve hlyna.com.ua:443:127.0.0.1 "https://hlyna.com.ua/revalidate?secret=$S" </dev/null && echo
docker image prune -f >/dev/null </dev/null
echo "remote steps done"
REMOTE
ssh hlyna "echo $HEAD_SHA > /opt/hlyna/.deployed-commit"
echo "Deployed $(git rev-parse --short HEAD)"
