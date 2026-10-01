import Link from "next/link";
import { notFound } from "next/navigation";
import { designationOf, getBoard } from "@/lib/kanban";
import { listForms } from "@/lib/forms";
import { KanbanBoard } from "@/components/kanban-board";
import { BoardViews } from "@/components/board-views";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = getBoard(Number(id));
  if (!board) notFound();
  const forms = listForms({ limit: 100 }).map((f) => ({ id: f.id, title: f.title }));
  const emails = [...new Set(board.tasks.map((t) => t.assigneeEmail).filter(Boolean))];
  const designations: Record<string, string> = Object.fromEntries(emails.map((e) => [e, designationOf(e)]));
  return (
    <>
      <Link href="/admin/boards" className="text-sm font-semibold text-brand-deep">← All boards</Link>
      <h1 className="mt-1 text-2xl font-extrabold">{board.name}</h1>
      {board.description && <p className="mt-1 text-sm text-zinc-500">{board.description}</p>}
      <div className="mt-4"><KanbanBoard initial={board} forms={forms} /></div>
      <h2 className="mt-8 text-xl font-extrabold">Plans</h2>
      <BoardViews tasks={board.tasks} boardId={board.id} designations={designations} />
    </>
  );
}
