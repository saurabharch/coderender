# Ticket: Tiptap editor with images

Parent: [Wayfinder map: Blog authoring overhaul](212-blog-authoring-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How does the body field become a tiptap editor (headings, bold/italic,
lists, links, quotes, inline images from the media library) while old
plain-text bodies keep rendering?

## Constraints

- Deps already installed (@mantine/tiptap + @tiptap/*); store HTML, render
  sanitized; plain-text legacy bodies render as today.
