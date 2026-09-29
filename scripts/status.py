#!/usr/bin/env python3
"""A2A sweep status (standard library only).

Usage: python3 scripts/status.py
Prints issue/task counts, frontier, and human-gated items.
Human-gated = open issue whose body mentions human/HITL/dashboard/calls,
or that has no open A2A envelope.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUES = ROOT / "issues"
TASKS = ROOT / ".opencode" / "a2a" / "tasks"
HUMAN_RE = re.compile(r"human|HITL|dashboard|calls|ratification|reaction", re.I)


def read_issues():
    out = []
    for f in sorted(ISSUES.glob("*.md")):
        t = f.read_text(encoding="utf-8")
        m = re.search(r"^Status:\s*(\w+)", t, re.M)
        out.append({"file": f.name, "status": m.group(1) if m else "?",
                    "title": t.splitlines()[0].lstrip("# ").strip(),
                    "human": bool(HUMAN_RE.search(t))})
    return out


def read_tasks():
    out = []
    for f in sorted(TASKS.glob("A2A-*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        out.append({"id": d["id"], "to": d["to"], "type": d["type"],
                    "status": d["status"]})
    return out


def main():
    issues, tasks = read_issues(), read_tasks()
    open_tasks = {t["id"] for t in tasks if t["status"] in ("inbox", "doing")}
    print(f"issues: {len(issues)}  tasks: {len(tasks)}  open tasks: {len(open_tasks)}")
    print("\n-- open issues --")
    for i in issues:
        if i["status"] in ("inbox", "brief", "doing"):
            print(f"[{i['status']}] {i['file']} — {i['title']}")
    print("\n-- human-gated (no agent move available) --")
    for i in issues:
        if i["status"] in ("inbox", "brief", "doing") and i["human"]:
            print(f"{i['file']} — {i['title']}")
    if open_tasks:
        print("\n-- open envelopes --")
        for t in tasks:
            if t["status"] in ("inbox", "doing"):
                print(f"{t['id']} [{t['status']}] -> {t['to']} ({t['type']})")
    else:
        print("\nqueue empty: no agent-executable work outstanding")


if __name__ == "__main__":
    main()
