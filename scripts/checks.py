#!/usr/bin/env python3
"""BBuilder completion checks (standard library only).

Usage: python3 scripts/checks.py
Exit 0 = all pass. Checks: skills validate, JSON parses, scripts compile,
A2A ledger consistency, expected files exist, git tree clean.
"""
import json
import py_compile
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


def main():
    r = subprocess.run([sys.executable, "scripts/validate_skills.py"],
                       capture_output=True, text=True, cwd=ROOT)
    check("skills-validate", r.returncode == 0, r.stdout + r.stderr)

    files = list(ROOT.rglob("*.json"))
    bad = []
    for f in files:
        try:
            json.loads(f.read_text(encoding="utf-8"))
        except ValueError:
            bad.append(str(f.relative_to(ROOT)))
    check("json-parse", not bad, "; ".join(bad))

    bad = []
    for f in sorted((ROOT / "scripts").glob("*.py")):
        try:
            py_compile.compile(str(f), doraise=True)
        except py_compile.PyCompileError:
            bad.append(f.name)
    check("scripts-compile", not bad, "; ".join(bad))

    tasks = [json.loads(f.read_text(encoding="utf-8"))
             for f in sorted((ROOT / ".opencode" / "a2a" / "tasks").glob("A2A-*.json"))]
    open_tasks = [t["id"] for t in tasks if t["status"] in ("inbox", "doing")]
    noresult = [t["id"] for t in tasks if t["status"] == "done" and not t.get("result")]
    missing = [t["id"] for t in tasks
               if not (ROOT / t["payload"]["expected"]).exists()]
    check("tasks-closed", not open_tasks, "; ".join(open_tasks))
    check("tasks-have-results", not noresult, "; ".join(noresult))
    check("expected-files-exist", not missing, "; ".join(missing))

    issues = list((ROOT / "issues").glob("*.md"))
    nores = [f.name for f in issues if "Status: done" in f.read_text(encoding="utf-8")
             and "(unresolved)" in f.read_text(encoding="utf-8")]
    noclaim = [f.name for f in issues if "Status: doing" in f.read_text(encoding="utf-8")
               and "Claimed-by:\n" in f.read_text(encoding="utf-8")]
    check("done-issues-resolved", not nores, "; ".join(nores))
    check("doing-issues-claimed", not noclaim, "; ".join(noclaim))

    try:
        r = subprocess.run(["node", "scripts/test_wizard.js"], capture_output=True,
                           text=True, cwd=ROOT)
        check("wizard-logic", r.returncode == 0, r.stdout + r.stderr)
    except FileNotFoundError:
        print("SKIP wizard-logic (node missing)")

    import re as _re
    pages = ROOT / "workspaces" / "mayo-clinic" / "pages"
    bad = []
    if pages.exists():
        for f in sorted(pages.glob("*.html")):
            for m in _re.finditer(r'''(?:src|href)="(assets/[^"]+|system\.css|motion\.js)"''',
                                  f.read_text(encoding="utf-8")):
                if not (pages / m.group(1)).exists():
                    bad.append(f"{f.name} -> {m.group(1)}")
    check("local-assets-exist", not bad, "; ".join(bad))

    r = subprocess.run(["git", "status", "--short"], capture_output=True,
                       text=True, cwd=ROOT)
    check("git-clean", r.stdout.strip() == "", r.stdout.strip())

    print(f"\n{len(failures)} failures" if failures else "\nALL CHECKS PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
