#!/usr/bin/env bash
# Zero-surprise deploy: gate → backup .next → build → reload → health-check →
# rollback on failure → tunnel verify. Never restarts on a red build.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3100}"
PUBLIC="${PUBLIC_URL:-https://coderender.optyx.shop/}"

echo "==> gate"
bash scripts/ci.sh

echo "==> prisma migrate (Linux runners only; skipped on Android)"
if [ "$(uname -m)" != "aarch64" ] || [ ! -d /data/data/com.termux ]; then
  npx prisma migrate deploy
else
  echo "skip: Prisma engines have no android/bionic builds; runtime uses node:sqlite with identical tables"
fi

echo "==> backup current build"
rm -rf .next.bak
[ -d .next ] && cp -r .next .next.bak || true

echo "==> build (the artifact pm2 will serve)"
npm run build

echo "==> reload pm2"
./node_modules/.bin/pm2 restart ecosystem.config.cjs --update-env
sleep 14

echo "==> health check local"
if ! curl -sf -o /dev/null --max-time 15 "http://localhost:$PORT/"; then
  echo "HEALTH FAILED — rolling back"
  ./node_modules/.bin/pm2 stop coderender >/dev/null 2>&1 || true
  rm -rf .next && mv .next.bak .next
  ./node_modules/.bin/pm2 restart ecosystem.config.cjs --update-env >/dev/null 2>&1
  sleep 10
  curl -sf -o /dev/null --max-time 15 "http://localhost:$PORT/" && echo "rollback healthy" || echo "ROLLBACK FAILED — manual recovery needed"
  exit 1
fi
rm -rf .next.bak

echo "==> tunnel verify"
pgrep -f "cloudflared.*tunnel" >/dev/null || echo "WARN: no tunnel connector running"
curl -sf -o /dev/null --max-time 30 "$PUBLIC" && echo "public OK: $PUBLIC" || echo "WARN: public check failed (DNS/tunnel?) — local is healthy"
echo "DEPLOY DONE"
