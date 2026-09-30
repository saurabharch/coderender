# Autonomous fix-and-ship loop (standing protocol)

Every session with nothing assigned runs this loop. No human needed until the report.

1. **Sweep**: `python3 scripts/status.py` (open issues/A2A) + `bash scripts/ci.sh`
   + `npm audit` delta + pm2 error-log tail + route smoke + TODO scan.
2. **Triage**: open issue with a `Question` + `Done when`, oldest/highest-value first.
   Human-gated items (credentials, DNS, real-world proof) stay open with the exact unblock step.
3. **Reproduce**: failing check or log line first; no fix without a failing signal.
4. **Fix**: smallest change honoring AGENTS.md (rewritten copy, original assets only).
5. **Verify**: full chain green + live local smoke + public tunnel smoke after pm2 reload.
6. **Changelog**: move Unreleased highlights under a new version (patch = fixes, minor = features).
7. **Release**: `bash scripts/release.sh <part> "<notes>"` → commit + tag.
8. **Deploy**: `bash scripts/deploy.sh` (gated, backup, health-check, rollback, tunnel verify).
9. **Push**: `bash scripts/sync.sh` + tag push (needs GitHub auth; if absent, report exact unblock).
10. **Report**: what was found, fixed, verified, released, deployed — and what still needs a human.
