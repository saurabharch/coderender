# Kanban boards upgrade (BTST contract, native)

Status: done
Labels: feature

## Question
Pipeline is lead-status only; no boards/columns/tasks, priorities,
assignees, ordering, hooks, analytics, agent access, or form links.

## Done when
- Tables + Prisma: KanbanBoard (formId link), KanbanColumn (ord),
  KanbanTask (priority, assignee, ord, submissionId link, archived, doneAt).
- `lib/kanban-core.ts` pure (priorities, order normalize, analytics math);
  `lib/kanban.ts` ops (CRUD, move/reorder invariants, hooks, resolvers,
  analytics, submission auto-task).
- Typed REST (boards, columns, tasks, move/reorder, analytics) team-gated.
- Agent tools + team tracking replies (boards/tasks/progress in chat).
- New board UI (native DnD, badges, assignees, analytics strip, linked
  form+submissions); drawer entry; pipeline kept.
- Chain green + smoke.
