# Wayfinder map: Blog authoring overhaul

Labels: wayfinder:map
Status: done

## Destination

Full author workflow: edit published posts, draft-by-default with
publish/unpublish toggles, author-only preview, tiptap editing with inline
images, and rich list cards (thumbnail, author, read time, like/comment
counts). Done when each ticket is live-proved with chain green and CI green.

## Notes

- Domain: Post stays the store (ALTER-ADD author, never rewrite); comments
  + comment-likes already exist and are reused for counters.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

- [Post lifecycle](213-blog-lifecycle.md): edit/draft-default/toggles/author preview live-proved.
- [Tiptap editor with images](214-blog-tiptap.md): sanitizer + bundle proven; toolbar client-rendered.
- [Rich list cards with counters](215-blog-cards.md): counters + dynamic index live-proved.

## Not yet specified

- Scheduled publishing (publish-at timestamps).

## Out of scope

- Public author profiles/pages; comment reply notifications.

## Children

- [Post lifecycle: edit, draft default, toggles, preview](213-blog-lifecycle.md) — done
- [Tiptap editor with images](214-blog-tiptap.md) — done (sanitizer + bundle proven; toolbar is client-rendered)
- [Rich list cards with counters](215-blog-cards.md) — done (counters + dynamic index live-proved)
