#!/usr/bin/env python3
"""Scaffold a wayfinder map + decision tickets (standard library only).

Usage:
  python3 scripts/wayfinder_map.py <map-spec.md>

Creates: issues/NNN-map.md (Labels: wayfinder:map), child issues
(Labels: wayfinder:<type>, Blocked-by filenames), and A2A envelopes for
AFK agent tickets (Worker != human), validated against agent-cards/.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUES = ROOT / "issues"
TASKS = ROOT / ".opencode" / "a2a" / "tasks"
TYPES = ("research", "prototype", "grilling", "task")

sys.path.insert(0, str(ROOT / "scripts"))
from a2a_new_task import main as new_task


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "item"


def next_num():
    nums = [int(m.group(1)) for f in ISSUES.glob("*.md")
            if (m := re.match(r"(\d+)-", f.name))]
    return max(nums, default=0) + 1


def newest_task_id():
    ids = sorted(f.stem.split("-")[1] for f in TASKS.glob("A2A-*.json"))
    return f"A2A-{ids[-1]}" if ids else "A2A-0000"


def parse(text):
    title, dest, notes, fog, oos, tickets = None, [], [], [], [], []
    cur, section = None, None
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.startswith("# Map:"):
            title, section = line[6:].strip(), None
            continue
        for head, key in (("## Destination", "dest"), ("## Notes", "notes"),
                          ("## Not yet specified", "fog"), ("## Out of scope", "oos")):
            if line.startswith(head):
                section = key
                break
        else:
            if line.startswith("## Ticket:"):
                cur = {"title": line[10:].strip(), "type": "", "worker": "",
                       "a2a": "", "expected": "", "blocked": [], "q": []}
                tickets.append(cur)
                section = "ticket"
                continue
            if section == "ticket" and cur is not None:
                for prefix, key in (("Type:", "type"), ("Worker:", "worker"),
                                    ("A2A:", "a2a"), ("Expected:", "expected")):
                    if line.startswith(prefix):
                        cur[key] = line[len(prefix):].strip()
                        break
                else:
                    if line.startswith("Blocked-by:"):
                        cur["blocked"] = [b.strip() for b in
                                          line[11:].split(",") if b.strip()]
                    elif line.strip() != "Question:":
                        cur["q"].append(line)
                continue
            if section in ("dest", "notes", "fog", "oos"):
                {"dest": dest, "notes": notes, "fog": fog, "oos": oos}[section].append(line)
    return title, dest, notes, tickets, fog, oos


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 1
    title, dest, notes, tickets, fog, oos = parse(
        Path(argv[0]).read_text(encoding="utf-8"))
    if not title or not tickets:
        print("spec needs '# Map:' and at least one '## Ticket:'")
        return 1
    for t in tickets:
        if t["type"] not in TYPES:
            print(f"bad Type on '{t['title']}': {t['type']}")
            return 1
        if not t["worker"]:
            print(f"missing Worker on '{t['title']}'")
            return 1
    by_title = {t["title"]: t for t in tickets}
    for t in tickets:
        for b in t["blocked"]:
            if b not in by_title:
                print(f"'{t['title']}' blocks on unknown ticket '{b}'")
                return 1

    ISSUES.mkdir(parents=True, exist_ok=True)
    n = next_num()
    names = {t["title"]: f"{n + 1 + i:03d}-{slugify(t['title'])}.md"
             for i, t in enumerate(tickets)}
    map_name = f"{n:03d}-{slugify(title)}.md"

    (ISSUES / map_name).write_text(
        f"# {title}\n\nStatus: inbox\nLabels: wayfinder:map\n\n"
        f"## Destination\n\n" + "\n".join(dest).strip() + "\n\n"
        f"## Notes\n\n" + "\n".join(notes).strip() + "\n\n"
        f"## Decisions so far\n\n(none yet)\n\n"
        f"## Tickets\n\n" + "".join(f"- [{t['title']}]({names[t['title']]}) — inbox\n"
                                    for t in tickets) + "\n"
        f"## Not yet specified\n\n" + "\n".join(fog).strip() + "\n\n"
        f"## Out of scope\n\n" + "\n".join(oos).strip() + "\n",
        encoding="utf-8")
    print(f"map: issues/{map_name}")

    for t in tickets:
        afk = t["worker"] != "human"
        task_id = ""
        if afk:
            if not t["a2a"] or not t["expected"]:
                print(f"'{t['title']}' needs A2A: + Expected: (AFK agent ticket)")
                return 1
            rc = new_task([t["worker"], t["a2a"], t["expected"],
                           f"--issue=issues/{names[t['title']]}"])
            if rc != 0:
                return rc
            task_id = newest_task_id()
        body = (f"# {t['title']}\n\nStatus: inbox\nLabels: wayfinder:{t['type']}\n"
                f"Map: {map_name}\n"
                f"Blocked-by: {', '.join(names[b] for b in t['blocked']) or '(none)'}\n"
                f"Claimed-by:\nA2A: {task_id or 'human checklist — no envelope'}\n\n"
                f"## Question\n\n" + "\n".join(t["q"]).strip() + "\n\n"
                f"## Resolution\n\n(unresolved)\n")
        (ISSUES / names[t["title"]]).write_text(body, encoding="utf-8")
        print(f"ticket: issues/{names[t['title']]} [{t['type']}] -> {task_id or 'human'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
