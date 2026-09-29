# A2A Task Protocol (file transport)

A2A-inspired agent-to-agent layer for BBuilder: same concepts as the
Agent2Agent protocol (agent cards, task envelopes, status lifecycle),
transported over files because the team runs inside OpenCode sessions.

## Roles
- `bbuilder-controller`: router + verifier. Only it dispatches and closes tasks.
- Workers (`researcher`, `offer-architect`, `automation-builder`,
  `client-manager`, `launcher`): execute one task, write the output file,
  report back. No fan-out.

## Locations
- Cards: `.opencode/a2a/agent-cards/<agent>.json` (capabilities, accepted types).
- Tasks: `.opencode/a2a/tasks/A2A-NNNN-<slug>.json` (envelopes).
- New tasks: `python3 scripts/a2a_new_task.py <to> <type> <expected-output> [--issue issues/NNN-x.md]`.

## Envelope schema
`id, from, to, type, payload{issue, inputs[], expected}, status, created, updated, result`.
Status lifecycle: `inbox` → `doing` → `done` | `failed`.
`result` holds the output file path + one-line verdict on close.

## Autonomous loop (controller, every sweep)
1. List `tasks/` with status `inbox`, oldest first.
2. Validate `to` against `agent-cards/` (accepted `type` must match).
3. Mark `doing`, dispatch: `Use the <to> subagent to ...` with issue + inputs + expected file.
4. On return: verify the file exists and meets done-criteria → set `result`, status `done`; else `failed` with reason.
5. Advance the linked `issues/` Status (inbox → brief → doing → done).
6. Repeat until no `inbox` tasks. Dependent tasks serially, independent ones may parallelize.

## Rules
- One task, one worker, one output file.
- TEST n8n instance first; no secrets in files; dated sources; prices DRAFT until verified.
- A `failed` task returns to `inbox` only with a changed plan noted in `result`.
