import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

async function broadcast(form: FormData) {
  "use server";
  const user = await sessionUser();
  const title = String(form.get("title") || "").slice(0, 120);
  const body = String(form.get("body") || "").slice(0, 2000);
  if (!title) return;
  getDb().prepare("INSERT INTO Notification (title, body, audience, createdBy) VALUES (?,?,?,?)")
    .run(title, body, String(form.get("audience") || "team"), user?.id ?? null);
  revalidatePath("/admin/notify");
}

export default async function NotifyPage() {
  const rows = getDb().prepare("SELECT * FROM Notification ORDER BY id DESC LIMIT 30").all() as
    { id: number; title: string; body: string; audience: string; createdAt: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Broadcast notification</h1>
      <form action={broadcast} className="mt-4 grid max-w-xl gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="grid gap-1 text-sm">Title<input name="title" required maxLength={120} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">Body<textarea name="body" rows={3} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">Audience
          <select name="audience" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
            <option value="team">Team (in-app)</option>
            <option value="all">All users (in-app)</option>
          </select>
        </label>
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Broadcast</button>
      </form>
      <h2 className="mt-6 font-bold">Recent</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {rows.map((n) => <li key={n.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10"><b>{n.title}</b> · {n.audience} · {n.createdAt.slice(0, 16).replace("T", " ")}<br />{n.body}</li>)}
      </ul>
    </>
  );
}
