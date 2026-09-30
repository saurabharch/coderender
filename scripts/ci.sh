#!/usr/bin/env bash
# Local gate: the exact chain CI runs. Pass here before every push.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run lint
npm run typecheck
npm test
npm run build
echo "CI GATE GREEN"
