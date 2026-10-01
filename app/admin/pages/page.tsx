import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

const TYPES = ["hero", "features", "cta", "faq", "text"] as const;

async function add(form: FormData) {
  "use server";
  await requireTeam();
  const slug = String(form.get("slug") || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const type = String(form.get("type") || "text");
  if (!slug || !(TYPES as readonly string[]).includes(type)) return;
  const max = (getDb().prepare("SELECT COALESCE(MAX(ord),-1) m FROM PageBlock WHERE pageSlug=?").get(slug) as { m: number }).m;
  getDb().prepare("INSERT INTO PageBlock (pageSlug, ord, type, title, body) VALUES (?,?,?,?,?)").run(
    slug, max + 1, type, String(form.get("title") || "").slice(0, 160), String(form.get("body") || "").slice(0, 8000));
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${slug}`);
}

async function move(form: FormData) {
  "use server";
  await requireTeam();
  const id = Number(form.get("id"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const cur = getDb().prepare("SELECT pageSlug, ord FROM PageBlock WHERE id=?").get(id) as
    { pageSlug: string; ord: number } | undefined;
  if (!cur) return;
  const other = getDb().prepare(
    dir < 0
      ? "SELECT id, ord FROM PageBlock WHERE pageSlug=? AND ord < ? ORDER BY ord DESC LIMIT 1"
      : "SELECT id, ord FROM PageBlock WHERE pageSlug=? AND ord > ? ORDER BY ord ASC LIMIT 1"
  ).get(cur.pageSlug, cur.ord) as { id: number; ord: number } | undefined;
  if (!other) return;
  getDb().prepare("UPDATE PageBlock SET ord=? WHERE id=?").run(other.ord, id);
  getDb().prepare("UPDATE PageBlock SET ord=? WHERE id=?").run(cur.ord, other.id);
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${cur.pageSlug}`);
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  const cur = getDb().prepare("SELECT pageSlug FROM PageBlock WHERE id=?").get(Number(form.get("id"))) as
    { pageSlug: string } | undefined;
  getDb().prepare("DELETE FROM PageBlock WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/pages");
  if (cur) revalidatePath(`/p/${cur.pageSlug}`);
}

export default async function PagesAdmin() {
  const blocks = getDb().prepare("SELECT * FROM PageBlock ORDER BY pageSlug, ord LIMIT 200").all() as
    { id: number; pageSlug: string; ord: number; type: string; title: string; body: string }[];
  const pages = [...new Set(blocks.map((b) => b.pageSlug))];
  return (
    <>
      <h1 className="text-2xl font-extrabold">UI Builder (pages)</h1>
      <p className="mt-1 text-sm text-zinc-500">Compose public pages from blocks. Renders at <code>/p/[slug]</code>.</p>
      <form action={add} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-3">
          <input name="slug" required placeholder="page slug" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select name="type" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input name="title" placeholder="Title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <textarea name="body" rows={3} placeholder="Body (one feature/line for features type)" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add block</button>
      </form>
      {pages.map((slug) => (
        <div key={slug} className="mt-4">
          <p className="font-bold">/{`p/${slug}`} <a className="ml-2 text-xs font-semibold underline" href={`/p/${slug}`}>preview →</a></p>
          <ul className="mt-1 space-y-1 text-sm">
            {blocks.filter((b) => b.pageSlug === slug).map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
                <span><b>{b.type}</b> · {b.title || b.body.slice(0, 60)}</span>
                <span className="flex gap-1">
                  <form action={move}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="dir" value="up" />
                    <button aria-label="Move up" className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">↑</button></form>
                  <form action={move}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="dir" value="down" />
                    <button aria-label="Move down" className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">↓</button></form>
                  <form action={remove}><input type="hidden" name="id" value={b.id} />
                    <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Del</button></form>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {pages.length === 0 && <p className="mt-2 text-sm text-zinc-500">No composed pages yet.</p>}
    </>
  );
}
