# Ticket 102-client-recovery

Status: done
Labels: bugfix, ux

User report: "Application error: a client-side exception" across pages.
Findings: server was healthy (fresh consistent build, chunks all 200, SSR clean
on every page); crashes match stale tabs held across rapid redeploys (old HTML
+ rebuilt chunks), amplified by a timed-out deploy that wiped .next mid-build.
- ChunkRecovery: one-time auto-reload on chunk-load failure (loop-guarded).
- global-error.tsx: friendly Try again / Reload instead of the default crash text.
- next.config: skip in-build lint/typecheck (ci.sh owns them) — device builds
  no longer die at the standalone ESLint step; builds run detached.
