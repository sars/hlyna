#!/usr/bin/env bash
# Nightly backup: pg_dump (custom format) + Payload media, keeps 14 days.
#   deploy/backup.sh                 run by hlyna-backup.timer
#   BACKUP_DIR=/tmp/x deploy/backup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hlyna}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"
umask 077

# Database: write to a temp name first so a half-written dump never looks valid.
docker compose exec -T db pg_dump -U hlyna -d hlyna -Fc > "$BACKUP_DIR/db_$STAMP.dump.part"
mv "$BACKUP_DIR/db_$STAMP.dump.part" "$BACKUP_DIR/db_$STAMP.dump"

# Uploads (public/media volume).
docker compose exec -T app tar -C /app/public -czf - media > "$BACKUP_DIR/media_$STAMP.tar.gz.part"
mv "$BACKUP_DIR/media_$STAMP.tar.gz.part" "$BACKUP_DIR/media_$STAMP.tar.gz"

find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db_*.dump' -o -name 'media_*.tar.gz' -o -name '*.part' \) -mtime +"$KEEP_DAYS" -delete

echo "backup ok: $BACKUP_DIR/db_$STAMP.dump ($(du -h "$BACKUP_DIR/db_$STAMP.dump" | cut -f1))"
