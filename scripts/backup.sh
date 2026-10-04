#!/usr/bin/env bash
# Daily database backup: online sqlite copy + integrity check + prune + log cap.
# Usage: bash scripts/backup.sh   (scheduler runs it daily ~03:00 IST)
# Restore: stop app, cp backups/dev-YYYYMMDD.db dev.db, start app.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DIR="$ROOT/backups"
mkdir -p "$DIR"
DAY=$(date +%F)
OUT="$DIR/dev-$DAY.db"

node --input-type=module -e "
import { DatabaseSync } from 'node:sqlite';
const src = new DatabaseSync('dev.db');
src.exec(\"VACUUM INTO '$OUT'\");
src.close();
" || { echo "backup FAILED"; exit 1; }

# Integrity check on the copy (never trust an unchecked backup).
CHK=$(node --input-type=module -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('$OUT', { readOnly: true });
const r = db.prepare('PRAGMA integrity_check').get();
console.log(r.integrity_check);
" 2>/dev/null || echo "FAILED")
if [ "$CHK" != "ok" ]; then echo "integrity check FAILED ($CHK)"; rm -f "$OUT"; exit 1; fi
echo "backup OK: $OUT ($(du -h "$OUT" | cut -f1), integrity ok)"

# Prune: keep 7 newest.
ls -t "$DIR"/dev-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "kept: $(ls "$DIR"/dev-*.db 2>/dev/null | wc -l) copies"

# Cap pm2 logs (90%-full disk): truncate outputs over 10MB, keep errors.
for f in ~/.pm2/logs/coderender-out.log ~/.pm2/logs/coderender-error.log; do
  if [ -f "$f" ] && [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -gt 10485760 ]; then
    tail -c 2097152 "$f" > "$f.tmp" && mv "$f.tmp" "$f"
    echo "capped: $f"
  fi
done
