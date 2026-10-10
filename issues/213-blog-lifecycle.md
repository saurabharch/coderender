# Ticket: Post lifecycle — edit, draft default, toggles, preview

Parent: [Wayfinder map: Blog authoring overhaul](212-blog-authoring-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do authors edit published posts, keep new writing in draft by default,
publish/unpublish per row, and preview drafts without going public?

## Constraints

- Edit prefills by `?id=`; same save action, author stamped from session.
- Draft default for new posts; per-row publish toggle + delete stays.
- Preview is team-only and renders exactly the public template.

## Resolution

Author workflow without touching the store shape (ALTER-ADD author only):
- Edit prefills by `?id=` (same save action, author stamped from session).
- New posts start as drafts (checkbox unchecked); per-row Publish toggle
  flips either way; delete unchanged.
- Team-only preview route rendering the exact public template with a
  draft banner; public drafts still 404.
Live proof over production with a real session: preview 200 + banner,
edit 200 with prefill + Save changes + Un-publish, public draft 404.
Probe post cleaned.
