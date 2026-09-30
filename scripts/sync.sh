#!/usr/bin/env bash
# Sync with origin: pull --rebase, then push. Needs GitHub auth (gh or token).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
timeout 60 git fetch origin
git pull --rebase origin main
bash scripts/ci.sh
timeout 90 git push origin main
timeout 30 git fetch origin
git status -sb | head -n 1
