# AI Chat parity (BTST contract, our inference)

Status: done
Labels: feature

## Question
Team chat is single-thread, non-streaming, no tool visibility, no hooks/analytics.

## Done when
- Conversation CRUD (list/rename/delete/new) + sidebar in /ai-chat.
- SSE streaming team endpoint via gateway token callback.
- Tool-call display in transcript; hooks (before/after/error) wired; chat analytics
  events; extended markdown; image attachments (team).
- Chain green + smoke.
