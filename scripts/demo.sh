#!/usr/bin/env bash
# One-command demo: build -> pm2 start (port 3100) -> cloudflared tunnel.
# Uses the SHARED tunnel file ~/.cloudflared/config.yml + same <tunnel>.json
# credentials (mayo-clinic/shop setup): one connector serves
# demo.optyx.shop -> :8090 AND demo.optyx.com -> :3100.
# Without Cloudflare credentials it falls back to a zero-setup quick tunnel.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-3100}"
HOSTNAME="demo.optyx.com"
SHARED_CFG="$HOME/.cloudflared/config.yml"
PID_FILE="/data/data/com.termux/files/usr/tmp/opencode/cloudflared-demo.pid"
TUNNEL_LOG="/data/data/com.termux/files/usr/tmp/opencode/cloudflared-demo.log"

echo "==> build"
npm run build

echo "==> pm2 start coderender on :$PORT"
./node_modules/.bin/pm2 start ecosystem.config.cjs --update-env >/dev/null
./node_modules/.bin/pm2 save >/dev/null 2>&1 || true

echo "==> wait for local health"
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "http://localhost:$PORT/"; then break; fi
  sleep 1
done
curl -sf -o /dev/null "http://localhost:$PORT/" && echo "local OK: http://localhost:$PORT/"

echo "==> cloudflare tunnel"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  sleep 2
fi
CRED="$(ls ~/.cloudflared/*.json 2>/dev/null | head -n 1 || true)"
if [ -n "$CRED" ] && [ -f "$SHARED_CFG" ]; then
  nohup cloudflared tunnel --config "$SHARED_CFG" run > "$TUNNEL_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  echo "named tunnel via shared $SHARED_CFG (same tunnel json as shop/mayo setup)"
  echo "  https://$HOSTNAME -> :$PORT  (needs the one-time DNS CNAME in README)"
else
  nohup cloudflared tunnel --url "http://localhost:$PORT" > "$TUNNEL_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  echo "quick tunnel starting — URL appears below in ~10s:"
  sleep 12
  grep -o "https://[^ ]*trycloudflare.com" "$TUNNEL_LOG" | head -n 1
fi
echo "logs: pm2 logs coderender | tail $TUNNEL_LOG"
