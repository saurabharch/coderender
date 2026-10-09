# Ticket: Server label templates

Parent: [Wayfinder map: Saved label templates](190-label-templates-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How are named studio presets stored server-side and applied in one tap —
without breaking the per-device localStorage flow?

## Constraints

- Template = validated settings JSON (paper/sticker/mode/toggles only —
  never code); unknown keys rejected.
- Studio keeps working offline (server template merges over device state
  when online); localStorage remains the offline truth.

## Resolution

Named server templates beside per-device localStorage:
- `LabelTemplate` table + gated API (list/save/remove); pure validator
  drops unknown keys, clamps ranges, restores defaults (tested).
- Studio Templates section: save-current, one-tap apply (server merges
  over device state), delete. Offline flow untouched (localStorage truth).
Live proof: hostile payload (bad enums, 9999 width, evil key, null show)
  stored cleaned; round-trip verified; delete verified. Probe rows dropped.
