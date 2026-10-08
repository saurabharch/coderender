# Ticket: GitHub Actions for checks and builds

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:task
Status: doing
Assignee: opencode
Blocked-by: (none — graduated from fog on owner direction)

## Question

How do lint/typecheck/test/build run in GitHub Actions on every push and PR,
with the web build as the on-device artifact and the rest in CI?

## Decision

- `.github/workflows/ci.yml`: Ubuntu runner, Node 22, npm cache, `npm ci`,
  then the same four gates as `scripts/ci.sh`. No Termux paths, no secrets.
- Secrets/prod deploy stays local (`deploy.sh`): documents required secrets
  without creating them. Native/device builds stay out (no runners).
