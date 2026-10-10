# Ticket: Tiptap editor with images

Parent: [Wayfinder map: Blog authoring overhaul](212-blog-authoring-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does the body field become a tiptap editor (headings, bold/italic,
lists, links, quotes, inline images from the media library) while old
plain-text bodies keep rendering?

## Constraints

- Deps already installed (@mantine/tiptap + @tiptap/*); store HTML, render
  sanitized; plain-text legacy bodies render as today.

## Resolution

Tiptap editing with images, legacy-safe:
- `BlogEditor` (tiptap v3: StarterKit H1-H3, bold/italic/underline/strike,
  lists, quote, link, image) with toolbar, image-URL insert + direct upload
  to the media library, hidden-input form contract unchanged.
- New `body-html` contract: HTML bodies render sanitized (scripts/handlers
  stripped, safe markup kept), plain-text legacy bodies render exactly as
  before. Unit-tested.
- Wired into the admin form, public post, and author preview.
Live proof: attack post rendered with script/handlers stripped and safe
markup kept; admin form serves the editor bundle (toolbar itself is
client-rendered — eyeball check is on the L2 list). Probe post cleaned.
