import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";

async function save(form: FormData) {
  "use server";
  const key = String(form.get("key") || "").toLowerCase().replace(/[^a-z0-9:_\-]+/g, "-").slice(0, 120);
  if (!key) return;
  getDb().prepare("INSERT INTO ContentBlock (key, title, body, published) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title, body=excluded.body, published=excluded.published")
    .run(key, String(form.get("title") || "").slice(0, 160), String(form.get("body") || "").slice(0, 20000), form.get("published") ? 1 : 0);
  revalidatePath("/admin/cms");
}

export default async function CmsAdmin() {
  const rows = getDb().prepare("SELECT * FROM ContentBlock ORDER BY key LIMIT 100").all() as
    { key: string; title: string; body: string; published: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">CMS blocks</h1>
      <p className="mt-1 text-sm text-zinc-500">Keys drive live slots (e.g. <code>announcement</code> above the header). Keys starting <code>page:</code> render as public pages at <code>/p/[slug]</code>.</p>
      <form action={save} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-2">
          <input name="key" required placeholder="key (e.g. announcement or page:offer)" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="title" placeholder="Title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <textarea name="body" rows={4} placeholder="Body text" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="published" value="1" defaultChecked className="h-5 w-5" /> Published</label>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save block</button>
      </form>
      <ul className="mt-4 space-y-1 font-mono text-xs">
        {rows.map((r) => <li key={r.key} className="rounded-xl border border-black/10 p-2 dark:border-white/10"><b>{r.key}</b> · {r.published ? "live" : "draft"} · {(r.title || r.body).slice(0, 100)}</li>)}
      </ul>
    </>
  );
}
