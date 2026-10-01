import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function moderate(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE Comment SET status=? WHERE id=?").run(String(form.get("status")), Number(form.get("id")));
  revalidatePath("/admin/comments");
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("DELETE FROM Comment WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/comments");
}

export default async function CommentsAdmin() {
  const rows = getDb().prepare(
    `SELECT c.id, c.name, c.body, c.status, p.title, p.slug FROM Comment c
     JOIN Post p ON p.id=c.postId ORDER BY c.id DESC LIMIT 100`).all() as
    { id: number; name: string; body: string; status: string; title: string; slug: string }[];
  const counts = getDb().prepare("SELECT status, COUNT(*) n FROM Comment GROUP BY status").all() as
    { status: string; n: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Comments</h1>
      <p className="mt-1 font-mono text-xs">{counts.map((c) => `${c.status}: ${c.n}`).join(" · ") || "none yet"}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((c) => (
          <li key={c.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p><b>{c.name}</b> on <a className="underline" href={`/blog/${c.slug}`}>{c.title}</a> · <b>{c.status}</b></p>
            <p className="mt-1">{c.body}</p>
            <div className="mt-2 flex gap-2">
              {(["approved", "pending", "rejected"] as const).map((s) => (
                <form key={s} action={moderate}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} />
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">{s}</button></form>
              ))}
              <form action={remove}><input type="hidden" name="id" value={c.id} />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button></form>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-zinc-500">No comments yet.</li>}
      </ul>
    </>
  );
}
