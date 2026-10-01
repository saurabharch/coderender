# Comments upgrade (BTST contract, native)

Status: done
Labels: feature

## Question
Comments are blog-only flat + pending; no threads/likes, no kanban/task
threads, no todos, masking only on reject path.

## Done when
- Comment: resourceType/resourceId, parentId threading, likes, authorEmail;
  KanbanTodo (per-task checklist) + TeamTodo tables; Prisma mirrors.
- Policy: strong words ALWAYS masked (write + render); block verdict stored
  as spam auto-hidden (shadow-accept); warn -> pending masked.
- Thread APIs (list/post/edit/delete/like/moderate/count) + hooks.
- CommentThread/Count components embedded: blog bottom, kanban task dialog,
  per-todo threads, team todos pages; moderation tabs + bulk.
- Chain green + smoke.
