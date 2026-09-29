#!/usr/bin/env bash
# Stop the demo: our cloudflared connector (by PID file, never other tunnels) + pm2 app.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PID_FILE="/data/data/com.termux/files/usr/tmp/opencode/cloudflared-demo.pid"
if [ -f "$PID_FILE" ]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
fi
./node_modules/.bin/pm2 stop coderender >/dev/null 2>&1 || true
./node_modules/.bin/pm2 delete coderender >/dev/null 2>&1 || true
echo "demo stopped"
