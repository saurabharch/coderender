import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function setStatus(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (!["pending", "approved", "spam"].includes(s)) return;
  getDb().prepare("UPDATE Comment SET status=? WHERE id=?").run(s, Number(form.get("id")));
  revalidatePath("/admin/comments");
}

async function bulk(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  const ids = String(form.get("ids") || "").split(",").map(Number).filter((n) => n > 0).slice(0, 100);
  if (!["pending", "approved", "spam"].includes(s) || ids.length === 0) return;
  for (const id of ids) getDb().prepare("UPDATE Comment SET status=? WHERE id=?").run(s, id);
  revalidatePath("/admin/comments");
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("DELETE FROM CommentLike WHERE commentId=?").run(Number(form.get("id")));
  getDb().prepare("DELETE FROM Comment WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/comments");
}

const TABS = ["pending", "approved", "spam"] as const;

function resourceLink(resourceType: string, resourceId: string): string | null {
  if (resourceType === "blog-post") return `/blog/${resourceId}#comments`;
  if (resourceType === "todo") return `/admin/todos/${resourceId}`;
  return null;
}

export default async function CommentsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof TABS)[number]) : "pending";
  const rows = getDb().prepare(
    `SELECT id, name, body, status, resourceType, resourceId, parentId, likes, createdAt FROM Comment
     WHERE status=? ORDER BY id DESC LIMIT 100`).all(tab) as
    { id: number; name: string; body: string; status: string; resourceType: string; resourceId: string; parentId: number | null; likes: number; createdAt: string }[];
  const counts = getDb().prepare("SELECT status, COUNT(*) n FROM Comment GROUP BY status").all() as
    { status: string; n: number }[];
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Comments moderation</h1>
      <p className="mt-1 text-sm text-zinc-500">Abuse is auto-hidden as spam on arrival — review and approve the humans, delete the rest.</p>
      <nav className="mt-3 flex gap-2" aria-label="Queues">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/comments?status=${t}`}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold ${t === tab ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {t} ({n(t)})
          </Link>
        ))}
      </nav>
      {rows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500">All {rows.length} on this page:</span>
          {(["approved", "spam"] as const).map((s) => (
            <form key={s} action={bulk}>
              <input type="hidden" name="ids" value={rows.map((r) => r.id).join(",")} />
              <input type="hidden" name="status" value={s} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-4 font-semibold dark:border-white/20">Mark all {s}</button>
            </form>
          ))}
        </div>
      )}
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((c) => {
          const link = resourceLink(c.resourceType, c.resourceId);
          return (
            <li key={c.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <p><b>{c.name}</b> · <code className="text-xs">{c.resourceType}:{c.resourceId}</code>
                {c.parentId ? <span className="text-xs text-zinc-500"> ↳ #{c.parentId}</span> : null}
                {link && <a className="ml-2 text-xs underline" href={link}>view</a>}
                <span className="ml-2 text-xs text-zinc-500">♥ {c.likes} · {c.createdAt.slice(0, 16).replace("T", " ")}</span></p>
              <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["approved", "pending", "spam"] as const).filter((s) => s !== tab).map((s) => (
                  <form key={s} action={setStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} />
                    <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">{s}</button></form>
                ))}
                <form action={remove}><input type="hidden" name="id" value={c.id} />
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button></form>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-zinc-500">Queue empty.</li>}
      </ul>
    </>
  );
}
