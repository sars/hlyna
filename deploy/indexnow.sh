#!/usr/bin/env bash
# Tell Bing, Yandex and other IndexNow engines about every URL in the sitemaps (free, no account).
#   bash deploy/indexnow.sh            (run after a deploy; push.sh calls it)
# The key file public/12e1186b0c0ec23ee49b7f8359e536ca.txt must be live at https://hlyna.com.ua/12e1186b0c0ec23ee49b7f8359e536ca.txt.
set -euo pipefail
HOST=hlyna.com.ua
IP=89.116.24.123 # read the sitemaps from our server even while some DNS caches still point elsewhere
KEY=12e1186b0c0ec23ee49b7f8359e536ca
URLS=$( { curl -fsS --resolve "$HOST:443:$IP" "https://$HOST/catalog-sitemap.xml"; curl -fsS --resolve "$HOST:443:$IP" "https://$HOST/pages-sitemap.xml" || true; } | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' | sort -u)
[ -n "$URLS" ] || { echo "IndexNow: no URLs found"; exit 0; }
BODY=$(printf '%s\n' "$URLS" | python3 -c '
import json, sys
urls = [u for u in sys.stdin.read().split() if u][:10000]
print(json.dumps({"host": sys.argv[1], "key": sys.argv[2], "keyLocation": f"https://{sys.argv[1]}/{sys.argv[2]}.txt", "urlList": urls}))' "$HOST" "$KEY")
CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' --data "$BODY")
echo "IndexNow: $(printf '%s\n' "$URLS" | wc -l | tr -d ' ') URLs, HTTP $CODE (200/202 = accepted)"
