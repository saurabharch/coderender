# Deps triage (12 Dependabot alerts)

Status: done
Labels: maintenance

## Question
12 open alerts: postcss x4 (nested next copy), js-yaml x1 (nested pm2
copy), vite/esbuild/vitest x7 (vitest 2.x chain, incl. 1 critical).
All dev/build-time only, none in prod runtime.

## Done when
- Nested postcss + js-yaml cleared within current majors.
- Vitest chain evaluated (major bump only if tests stay green).
- Chain green + push; alerts re-checked.
