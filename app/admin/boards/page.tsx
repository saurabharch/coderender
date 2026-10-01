import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createBoard, deleteBoard, listBoards } from "@/lib/kanban";
import { requireTeam } from "@/lib/auth";

async function create(form: FormData) {
  "use server";
  await requireTeam();
  await createBoard({ name: String(form.get("name") || ""), description: String(form.get("description") || "") });
  revalidatePath("/admin/boards");
}

async function remove(id: number) {
  "use server";
  await requireTeam();
  await deleteBoard(id);
  revalidatePath("/admin/boards");
}

export default async function BoardsAdmin() {
  const boards = listBoards();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Kanban Boards</h1>
      <p className="mt-1 text-sm text-zinc-500">Work boards with priorities, assignees, form links, and analytics. (Lead funnel lives under Pipeline.)</p>
      <form action={create} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-2">
          <input name="name" required placeholder="Board name (e.g. Client work)" maxLength={80}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="description" placeholder="Description (optional)" maxLength={200}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Create board</button>
      </form>
      <ul className="mt-4 space-y-2">
        {boards.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
            <div>
              <Link href={`/admin/boards/${b.id}`} className="font-bold underline">{b.name}</Link>
              <p className="font-mono text-xs text-zinc-500">{b.columns} columns · {b.tasks} open tasks{b.formId ? ` · form #${b.formId}` : ""}</p>
            </div>
            <form action={remove.bind(null, b.id)} className="ml-auto">
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
            </form>
          </li>
        ))}
        {boards.length === 0 && <li className="text-sm text-zinc-500">No boards yet — create the first above.</li>}
      </ul>
    </>
  );
}
