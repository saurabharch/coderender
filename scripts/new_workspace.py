#!/usr/bin/env python3
"""Scaffold a workspace from the templates (standard library only).

Usage:
  python3 scripts/new_workspace.py <kind> "<Name>" [--force]

Kinds:
  product      research + product templates (market map, PRD, brand-emotion profile)
  launch       GTM + launch templates (ICP, outreach, landing page, launch checklist)
  growth       gap analysis templates (scorecard, funnel audit, experiments)
  client       services delivery templates + brand kit intake (intake, SOW, playbook, SLA)
  acquisition  client acquisition templates (lead plan, call script, proposal, pipeline)
  offers       services offers templates (catalog, one-pagers, pricing, packages)
  automation   workflow automation templates + n8n starter skeletons (in n8n/)
  all          everything

Creates workspaces/<slug>/ and fills {{project}}, {{client}}, {{brand}},
{{product}} and {{date}}. Other {{placeholders}} are left for you to fill.
--force adds missing files to an existing workspace and never overwrites yours.
"""
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"

KINDS = {
    "product": ["research", "product"],
    "launch": ["gtm", "launch"],
    "growth": ["growth"],
    "client": ["services", "product/brand-kit-intake.md"],
    "acquisition": ["acquisition"],
    "offers": ["offers"],
    "automation": ["automation", "automation/n8n"],
    "all": ["research", "product", "gtm", "launch", "growth", "services",
            "acquisition", "offers", "automation", "automation/n8n"],
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "workspace"


def fill(text: str, name: str) -> str:
    values = {
        "project": name,
        "client": name,
        "brand": name,
        "product": name,
        "date": date.today().isoformat(),
    }
    for key, val in values.items():
        text = text.replace("{{" + key + "}}", val)
    return text


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    force = "--force" in argv
    if len(args) != 2 or args[0] not in KINDS:
        print(__doc__)
        return 1
    kind, name = args
    dest = ROOT / "workspaces" / slugify(name)
    if dest.exists() and not force:
        print(f"{dest} already exists. Use --force to add missing files.")
        return 1
    dest.mkdir(parents=True, exist_ok=True)

    count = 0
    for item in KINDS[kind]:
        src = TEMPLATES / item
        if src.is_file():
            files = [src]
        else:
            files = sorted(list(src.glob("*.md")) + list(src.glob("*.json")))
        target_dir = dest / "n8n" if src.name == "n8n" else dest
        target_dir.mkdir(parents=True, exist_ok=True)
        for f in files:
            target = target_dir / f.name
            if target.exists():
                continue
            text = f.read_text(encoding="utf-8")
            if f.suffix == ".md":
                text = fill(text, name)
            target.write_text(text, encoding="utf-8")
            count += 1
    print(f"Created {count} files in {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
