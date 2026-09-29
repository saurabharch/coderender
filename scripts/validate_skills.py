#!/usr/bin/env python3
"""Check every skill: frontmatter, name matches folder, description present,
referenced assets exist, JSON assets parse, and SKILL.md stays under 500 lines."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures = 0

for skill_md in sorted((ROOT / "skills").glob("*/SKILL.md")):
    folder = skill_md.parent
    text = skill_md.read_text(encoding="utf-8")
    problems = []

    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        problems.append("missing YAML frontmatter")
    else:
        fm = m.group(1)
        name = re.search(r"^name:\s*(.+)$", fm, re.M)
        desc = re.search(r"^description:\s*(.+)$", fm, re.M)
        if not name or name.group(1).strip() != folder.name:
            problems.append("name missing or does not match folder")
        if not desc or len(desc.group(1).strip()) < 40:
            problems.append("description missing or too short")

    if len(text.splitlines()) > 500:
        problems.append("SKILL.md over 500 lines")

    for ref in set(re.findall(r"`assets/([\w\-\./]+?)`", text)):
        if not (folder / "assets" / ref).exists():
            problems.append(f"missing asset: assets/{ref}")

    for j in (folder / "assets").rglob("*.json"):
        try:
            json.loads(j.read_text(encoding="utf-8"))
        except ValueError as e:
            problems.append(f"invalid JSON {j.name}: {e}")

    if problems:
        failures += 1
        print(f"FAIL {folder.name}: " + "; ".join(problems))
    else:
        print(f"OK   {folder.name}")

sys.exit(1 if failures else 0)
