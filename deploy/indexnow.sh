#!/usr/bin/env bash
# Tell Bing, Yandex and other IndexNow engines about NEW or CHANGED pages only (free, no account).
#   bash deploy/indexnow.sh          run by hand after a batch of pages was added or really changed
# Not called on every deploy: resubmitting the whole site often gets a host's pings ignored.
# Sends only URLs whose sitemap <lastmod> differs from the last accepted submission (state in
# deploy/.indexnow-state.tsv, gitignored) and runs at most once per 24 hours unless FORCE=1.
# The key file public/12e1186b0c0ec23ee49b7f8359e536ca.txt must be live at https://hlyna.com.ua/12e1186b0c0ec23ee49b7f8359e536ca.txt.
set -euo pipefail
HOST=hlyna.com.ua
IP=89.116.24.123 # read the sitemap from our server even if a local DNS cache is stale
KEY=12e1186b0c0ec23ee49b7f8359e536ca
DIR="$(cd "$(dirname "$0")" && pwd)"
STATE="$DIR/.indexnow-state.tsv"
STAMP="$DIR/.indexnow-last"
NOW="$(mktemp)"; trap 'rm -f "$NOW"' EXIT

if [ -f "$STAMP" ] && [ "${FORCE:-0}" != 1 ]; then
  AGE=$(( $(date +%s) - $(cat "$STAMP") ))
  [ "$AGE" -ge 86400 ] || { echo "IndexNow: last run $((AGE / 3600)) h ago; wait 24 h or use FORCE=1"; exit 0; }
fi

# url<TAB>lastmod for every page in the sitemap
curl -fsS --resolve "$HOST:443:$IP" "https://$HOST/catalog-sitemap.xml" | python3 -c '
import re, sys
for block in re.findall(r"<url>(.*?)</url>", sys.stdin.read(), re.S):
    loc = re.search(r"<loc>([^<]+)</loc>", block)
    mod = re.search(r"<lastmod>([^<]+)</lastmod>", block)
    if loc:
        print(loc.group(1) + "\t" + (mod.group(1) if mod else ""))' > "$NOW"
[ -s "$NOW" ] || { echo "IndexNow: no URLs found"; exit 0; }

BODY=$(python3 - "$NOW" "$STATE" "$HOST" "$KEY" <<'PY'
import json, os, sys
now_file, state_file, host, key = sys.argv[1:5]
old = {}
if os.path.exists(state_file):
    for line in open(state_file):
        u, _, m = line.rstrip("\n").partition("\t")
        old[u] = m
urls = []
for line in open(now_file):
    u, _, m = line.rstrip("\n").partition("\t")
    if old.get(u) != m:
        urls.append(u)
if urls:
    print(json.dumps({"host": host, "key": key, "keyLocation": f"https://{host}/{key}.txt", "urlList": urls[:10000]}))
PY
)
[ -n "$BODY" ] || { echo "IndexNow: nothing new or changed"; exit 0; }

COUNT=$(printf '%s' "$BODY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["urlList"]))')
CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' --data "$BODY")
echo "IndexNow: $COUNT new/changed URLs, HTTP $CODE (200/202 = accepted)"
if [ "$CODE" = 200 ] || [ "$CODE" = 202 ]; then
  cp "$NOW" "$STATE"
  date +%s > "$STAMP"
fi
