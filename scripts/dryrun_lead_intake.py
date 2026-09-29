#!/usr/bin/env python3
"""Dry-run the lead-intake flow logic (standard library only).

Usage: python3 scripts/dryrun_lead_intake.py
Mirrors workspaces/acme-studio/n8n/lead-intake-to-crm.json:
webhook -> normalize -> validate email -> CRM placeholder -> respond 200/422.
Exit 0 when all probes behave as the flow specifies.
"""
import json
import re
from pathlib import Path

FLOW = Path(__file__).resolve().parent.parent / "workspaces" / "acme-studio" \
    / "n8n" / "lead-intake-to-crm.json"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SEGMENTS = {"opd": "care-seeker", "camp": "camp-lead", "opinion": "second-opinion"}


def handle(payload):
    """Returns (status_code, body) exactly as the flow's respond nodes would."""
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    phone = re.sub(r"\D", "", str(payload.get("phone", "")))
    errors = []
    if not name:
        errors.append("name required")
    if not EMAIL_RE.match(email):
        errors.append("valid email required")
    if len(phone) != 10:
        errors.append("10-digit phone required")
    if errors:
        return 422, {"ok": False, "errors": errors}
    segment = SEGMENTS.get(str(payload.get("form", "")).strip().lower(), "general")
    print(f"  [crm-placeholder] upsert {{name={name}, email={email}, segment={segment}}}")
    return 200, {"ok": True, "segment": segment}


def main():
    flow = json.loads(FLOW.read_text(encoding="utf-8"))
    types = [n.get("type", "") for n in flow.get("nodes", [])]
    assert any("Webhook" in t for t in types), "webhook node missing"
    assert any("If" in t or "if" in t for t in types), "validate branch missing"
    assert any("Respond" in t or "respond" in t for t in types), "respond node missing"
    print("flow structure OK:", len(types), "nodes")

    cases = [
        ({"name": "Probe", "email": "probe@example.com",
          "phone": "9876543210", "form": "camp"}, 200),
        ({"name": "Probe", "email": "not-an-email",
          "phone": "9876543210", "form": "opd"}, 422),
        ({"name": "", "email": "probe@example.com",
          "phone": "123", "form": "opinion"}, 422),
    ]
    ok = True
    for payload, want in cases:
        got, body = handle(payload)
        passed = got == want
        ok &= passed
        print(f"{'PASS' if passed else 'FAIL'} in={payload} -> {got} {body}")
    print("DRY RUN PASS" if ok else "DRY RUN FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
