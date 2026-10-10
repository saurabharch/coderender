# Ticket: Rich list cards with counters

Parent: [Wayfinder map: Blog authoring overhaul](212-blog-authoring-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do blog list cards show thumbnail, author, read time, and like/comment
counters with icons?

## Constraints

- Counters aggregate existing tables (approved comments, comment likes);
  read time from body length; no new tracking tables.

## Resolution

Presentable list cards from existing tables only:
- Thumbnail, title, excerpt (fallback: body-derived), author, read time,
  views, comment likes, comment counts — each with lucide icons.
- Counters aggregate approved comments + their likes; read time from body
  length; no new tracking.
- Real bug caught en route: the index was statically prerendered, so new
  posts never appeared until rebuild — now force-dynamic.
Live proof: probe card rendered author, excerpt, read time, 42 views,
1 like, 1 comment. Probe rows cleaned.
Note: one red-build restart mistake mid-ticket (chained restart past a
font-flake failure, pm2 errored); recovered via clean rebuild per playbook.
