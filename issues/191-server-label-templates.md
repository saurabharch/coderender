# Ticket: Server label templates

Parent: [Wayfinder map: Saved label templates](190-label-templates-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How are named studio presets stored server-side and applied in one tap —
without breaking the per-device localStorage flow?

## Constraints

- Template = validated settings JSON (paper/sticker/mode/toggles only —
  never code); unknown keys rejected.
- Studio keeps working offline (server template merges over device state
  when online); localStorage remains the offline truth.
