import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createTodo, deleteTodo, listTodos, updateTodo } from "@/lib/todos";
import { requireTeam } from "@/lib/auth";
import { CommentCount } from "@/components/comment-thread";

async function create(form: FormData) {
  "use server";
  await requireTeam();
  createTodo({ title: String(form.get("title") || ""), body: String(form.get("body") || "") });
  revalidatePath("/admin/todos");
}

async function toggle(id: number, done: boolean) {
  "use server";
  await requireTeam();
  updateTodo(id, { status: done ? "done" : "open" });
  revalidatePath("/admin/todos");
}

async function remove(id: number) {
  "use server";
  await requireTeam();
  deleteTodo(id);
  revalidatePath("/admin/todos");
}

export default async function TodosAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status === "done" ? "done" : sp.status === "open" ? "open" : undefined;
  const todos = listTodos(status);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Team Todos</h1>
      <p className="mt-1 text-sm text-zinc-500">Small internal tasks, each with its own discussion thread.</p>
      <nav className="mt-3 flex gap-2" aria-label="Filter">
        {[["all", "/admin/todos"], ["open", "/admin/todos?status=open"], ["done", "/admin/todos?status=done"]].map(([l, h]) => (
          <Link key={l} href={h} className="min-h-[44px] rounded-full border border-black/15 px-4 py-2 text-sm font-semibold dark:border-white/20">{l}</Link>
        ))}
      </nav>
      <form action={create} className="mt-3 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <input name="title" required placeholder="Todo title" maxLength={120}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add todo</button>
      </form>
      <ul className="mt-4 space-y-2">
        {todos.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
            <form action={toggle.bind(null, t.id, t.status !== "done")}>
              <button aria-label={t.status === "done" ? "Reopen" : "Mark done"}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">
                {t.status === "done" ? "✓" : "○"}
              </button>
            </form>
            <div className={t.status === "done" ? "line-through opacity-60" : ""}>
              <Link href={`/admin/todos/${t.id}`} className="font-bold underline">{t.title}</Link>
              <p className="font-mono text-xs text-zinc-500">{t.status} <CommentCount resourceType="todo" resourceId={String(t.id)} /></p>
            </div>
            <form action={remove.bind(null, t.id)} className="ml-auto">
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
            </form>
          </li>
        ))}
        {todos.length === 0 && <li className="text-sm text-zinc-500">Nothing here.</li>}
      </ul>
    </>
  );
}
