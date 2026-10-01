import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoard } from "@/lib/kanban";
import { listForms } from "@/lib/forms";
import { KanbanBoard } from "@/components/kanban-board";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = getBoard(Number(id));
  if (!board) notFound();
  const forms = listForms({ limit: 100 }).map((f) => ({ id: f.id, title: f.title }));
  return (
    <>
      <Link href="/admin/boards" className="text-sm font-semibold text-brand-deep">← All boards</Link>
      <h1 className="mt-1 text-2xl font-extrabold">{board.name}</h1>
      {board.description && <p className="mt-1 text-sm text-zinc-500">{board.description}</p>}
      <div className="mt-4"><KanbanBoard initial={board} forms={forms} /></div>
    </>
  );
}
