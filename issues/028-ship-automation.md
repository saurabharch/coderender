# Ship automation: CI + gated deploy + releases

Status: doing
Labels: chore

## Question
Shipping is manual: no CI gate, no rollback, releases/changelog ad hoc.

## Done when
- `.github/workflows/ci.yml` gates every push/PR; `release.yml` cuts tag releases.
- `scripts/ci.sh` (local gate), `release.sh` (version+changelog+tag), `deploy.sh`
  (build → backup → reload → health-check → rollback), `sync.sh` (pull/push).
- CHANGELOG.md started; deploy verified live without downtime.
