#!/bin/sh
# Install the Business Builder skills for Claude Code.
# Usage: sh scripts/install_skills.sh [--project] [--yes]
#   default   -> ~/.claude/skills/   (all your projects)
#   --project -> ./.claude/skills/   (current directory only)
#   --yes     -> overwrite existing skills without asking
set -e
HERE=$(cd "$(dirname "$0")/.." && pwd)
DEST="$HOME/.claude/skills"
YES=0
for arg in "$@"; do
  case "$arg" in
    --project) DEST="$(pwd)/.claude/skills" ;;
    --yes) YES=1 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done
mkdir -p "$DEST"
for d in "$HERE"/skills/*/; do
  name=$(basename "$d")
  if [ -e "$DEST/$name" ]; then
    if [ "$YES" -eq 1 ]; then
      rm -rf "$DEST/$name"
    else
      printf "%s already exists. Overwrite? [y/N] " "$name"
      read ans || ans=n
      case "$ans" in
        y|Y) rm -rf "$DEST/$name" ;;
        *) echo "  skipped $name"; continue ;;
      esac
    fi
  fi
  cp -R "$d" "$DEST/$name"
  echo "  installed $name -> $DEST/$name"
done
echo "Done. Restart Claude Code so it rescans skills."
