#!/usr/bin/env python3
"""Create an A2A task envelope (standard library only).

Usage:
  python3 scripts/a2a_new_task.py <to> <type> <expected-output> [--issue issues/NNN-x.md] [--from AGENT]

Example:
  python3 scripts/a2a_new_task.py offer-architect offer.pricing workspaces/business-builder/00-offers-decision.md
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / ".opencode" / "a2a" / "agent-cards"
TASKS = ROOT / ".opencode" / "a2a" / "tasks"


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "task"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    opts = {a[2:]: True for a in argv if a.startswith("--") and "=" not in a}
    kv = dict(a[2:].split("=", 1) for a in argv if a.startswith("--") and "=" in a)
    if len(args) != 3:
        print(__doc__)
        return 1
    to, kind, expected = args
    sender = kv.get("from", "bbuilder-controller")
    issue = kv.get("issue", "")

    card = CARDS / f"{to}.json"
    if not card.exists():
        print(f"unknown worker: {to} (no card in agent-cards/)")
        return 1
    accepts = json.loads(card.read_text(encoding="utf-8")).get("accepts", [])
    if kind not in accepts:
        print(f"{to} does not accept {kind}; accepts: {', '.join(accepts)}")
        return 1

    TASKS.mkdir(parents=True, exist_ok=True)
    nums = [int(m.group(1)) for f in TASKS.glob("A2A-*.json")
            if (m := re.match(r"A2A-(\d+)-", f.name))]
    num = max(nums, default=0) + 1
    dest = TASKS / f"A2A-{num:04d}-{slugify(kind)}.json"
    today = date.today().isoformat()
    dest.write_text(json.dumps({
        "id": f"A2A-{num:04d}",
        "from": sender,
        "to": to,
        "type": kind,
        "payload": {"issue": issue, "inputs": [], "expected": expected},
        "status": "inbox",
        "created": today,
        "updated": today,
        "result": None,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Created {dest.relative_to(ROOT)} status=inbox")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
