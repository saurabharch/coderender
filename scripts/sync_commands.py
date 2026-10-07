#!/usr/bin/env python3
"""Regenerate .opencode/commands/*.md from skills/*/SKILL.md frontmatter.
Run after vendoring new skills so every skill is invokable as /<name>."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def short(desc: str) -> str:
    first = desc.split(". ")[0]
    if len(first) <= 160:
        return first
    return first[:157].rsplit(" ", 1)[0] + "…"

def desc_of(fm: str) -> str:
    m = re.search(r"^description:\s*(>?\|?)\s*\n((?:[ \t]+.*\n?)+)", fm, re.M)
    if m and m.group(1) in (">", "|"):
        return re.sub(r"\n[ \t]+", " ", m.group(2)).strip()
    inline = re.search(r"^description:\s*(.+)$", fm, re.M)
    return inline.group(1).strip() if inline else ""

def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--global", dest="global_", action="store_true",
                    help="also symlink commands into ~/.config/opencode/commands so they appear in every session")
    args = ap.parse_args()
    cmd = ROOT / ".opencode" / "commands"
    cmd.mkdir(parents=True, exist_ok=True)
    made = 0
    for md in sorted((ROOT / "skills").glob("*/SKILL.md")):
        m = re.match(r"^---\n(.*?)\n---\n", md.read_text(encoding="utf-8"), re.S)
        if not m:
            print(f"SKIP (no frontmatter): {md.parent.name}")
            continue
        name = re.search(r"^name:\s*(.+)$", m.group(1), re.M).group(1).strip()
        (cmd / f"{name}.md").write_text(
            f"---\ndescription: {short(desc_of(m.group(1)))}\n---\n\n"
            f"Load the `{name}` skill with the Skill tool and follow it for this task.\n\n$ARGUMENTS\n")
        made += 1
        if args.global_:
            dest = Path.home() / ".config" / "opencode" / "commands" / f"{name}.md"
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.is_symlink() or dest.exists():
                dest.unlink()
            dest.symlink_to(cmd / f"{name}.md")
    print(f"commands: {made}")

if __name__ == "__main__":
    main()
