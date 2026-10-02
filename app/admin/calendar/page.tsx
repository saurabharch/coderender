import Link from "next/link";
import { designationOf, getBoard, listBoards } from "@/lib/kanban";
import { BoardViews } from "@/components/board-views";
import type { BoardTask } from "@/lib/kanban";

export default async function CalendarPage() {
  const boards = listBoards();
  const all: BoardTask[] = [];
  const names: Record<number, string> = {};
  for (const b of boards) {
    const full = getBoard(b.id);
    if (!full) continue;
    names[b.id] = full.name;
    all.push(...full.tasks);
  }
  const emails = [...new Set(all.map((t) => t.assigneeEmail).filter(Boolean))];
  const designations: Record<string, string> = Object.fromEntries(emails.map((e) => [e, designationOf(e)]));
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Plans</p>
      <h1 className="display-1 mt-1">Calendar</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every board, one timeline. Plan from any date, filter by team, push to Google.{" "}
        {boards.map((b) => (
          <span key={b.id}><Link href={`/admin/boards/${b.id}`} className="underline">{b.name}</Link>{" · "}</span>
        ))}
      </p>
      <BoardViews boardId={0} initialTasks={all} columns={[]} designations={designations} boardNames={names} />
    </>
  );
}
