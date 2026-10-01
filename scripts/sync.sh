#!/usr/bin/env bash
# Sync with origin using GITHUB_TOKEN imported from .env (never committed).
# pull --rebase, run CI gate, push main + tags.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
if [ -z "${GITHUB_TOKEN:-}" ]; then echo "GITHUB_TOKEN missing in .env" >&2; exit 1; fi
AUTH=$(printf '%s' "x-access-token:$GITHUB_TOKEN" | base64 -w0)
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="http.extraHeader"
export GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $AUTH"
git -c credential.helper= fetch origin
git pull --rebase origin main
bash scripts/ci.sh
git -c credential.helper= push origin main
git -c credential.helper= push origin --tags
git fetch origin
git status -sb | head -n 1
