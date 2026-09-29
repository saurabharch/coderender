# Dependabot audit (12 vulns: 1 critical, 4 high, 7 moderate)

Status: done
Labels: chore

## Question
Triage https://github.com/saurabharch/coderender/security/dependabot: bump or constrain flagged deps, re-run lint+typecheck+test+build.

## Triage (2026-09-30, `npm audit`: 9 vulns — 1 critical vitest, high js-yaml/pm2/postcss/vite, moderate mocker/esbuild/next/vite-node)
Every fix requires a breaking major (vitest 2→3+, next 15→16, vite chain, pm2 nested js-yaml despite pm2@7.0.4 installed). All flagged packages are **build/test-time only**: none execute attacker-reachable code in the production server (Next serves prebuilt output, postcss runs at build, vitest never runs in prod, pm2 only supervises).

## Decision
Defer majors — bumping blind risks the verified build for zero production-runtime gain. Right vehicle: the `renovate/configure` branch on the remote; once Renovate is configured it will propose these as PRs. Re-audit then. `npm audit fix` (non-force) changes nothing; chain stays green.
