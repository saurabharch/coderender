# Wayfinder layer (BBuilder local tracker + A2A)

Adapts the `wayfinder` skill to this repo. Wayfinder concepts stay
canonical; this file fixes where each physically lives here.

## Concept map
| Wayfinder | BBuilder |
|---|---|
| Map issue (`wayfinder:map`) | `issues/NNN-<slug>.md`, `Labels: wayfinder:map` |
| Decision ticket | Child issue, `Labels: wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`) |
| Claim (assignee) | `Claimed-by:` line + `Status: doing`. Unclaimed = open, `Claimed-by:` empty |
| Blocking edges | `Blocked-by:` filenames (no native graph in markdown tracker) |
| Frontier | open + unblocked + unclaimed children, in number order |
| Resolution | `## Resolution` section + `Status: done` + gist appended to map `Decisions so far` + linked A2A task closed |
| Fog / out of scope | Map sections `Not yet specified` / `Out of scope` |

## Ticket type → execution
| Type | Loop | Execution |
|---|---|---|
| `research` (AFK) | parallel OK | A2A envelope to domain worker (`research.*`, `automation.*`) |
| `task` AFK (agent-doable) | one per sweep | A2A envelope, `result` records facts later tickets need |
| `task` HITL (human-only) | one per sweep | No envelope; precise checklist in the issue (cf. n8n wizard) |
| `prototype` / `grilling` (HITL) | one per sweep | Live session with human; agent never answers its own grill |

## Controller loop ("work through the map")
One ticket per sweep (research parallel exempt). Claim first, then resolve:
AFK → dispatch A2A → verify file → close task → record resolution → close
issue → map gist. HITL → run exchange/checklist → same close-out.
Graduate fog and rule out-of-scope per the skill; update/delete invalidated tickets.

## Scaffolding
`python3 scripts/wayfinder_map.py <map-spec.md>` creates the map issue,
child issues, and A2A envelopes for AFK agent tickets (validated against
`agent-cards/`). Spec format: `# Map:`, `## Destination`, `## Notes`,
per-ticket `## Ticket:` blocks (`Type/Worker/A2A/Expected/Blocked-by/Question`),
`## Not yet specified`, `## Out of scope`. Convention source: `wayfinder` skill.
