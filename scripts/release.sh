#!/usr/bin/env bash
# Cut a release: gate (lint+typecheck+test+build) → bump version, changelog
# entry, commit, tag. Push via sync.sh.
# Usage: bash scripts/release.sh [patch|minor|major] ["notes line"]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> release gate"
bash scripts/ci.sh
PART="${1:-patch}"
NOTE="${2:-}"
CUR=$(node -p "require('./package.json').version")
case "$PART" in
  major) NEW=$(node -e "const[v,m,p]='$CUR'.split('.').map(Number);console.log(\`\${v+1}.0.0\`)");;
  minor) NEW=$(node -e "const[v,m,p]='$CUR'.split('.').map(Number);console.log(\`\${v}.\${m+1}.0\`)");;
  *) NEW=$(node -e "const[v,m,p]='$CUR'.split('.').map(Number);console.log(\`\${v}.\${m}.\${p+1}\`)");;
esac
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='$NEW';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
DATE=$(date +%F)
ENTRY=$(printf '## [%s] - %s\n%s\n' "$NEW" "$DATE" "${NOTE:+- $NOTE}")
python3 - "$ENTRY" <<'EOF'
import sys
from pathlib import Path
p = Path("CHANGELOG.md")
t = p.read_text()
marker = "## [Unreleased]\n"
assert marker in t, "CHANGELOG missing Unreleased section"
p.write_text(t.replace(marker, marker + sys.argv[1], 1))
print("changelog updated")
EOF
git add -A
git -c user.name="coderender" -c user.email="hello@coderender.in" commit -m "Release v$NEW" --allow-empty
git tag "v$NEW"
echo "tagged v$NEW — push with: bash scripts/sync.sh && git push origin v$NEW"
