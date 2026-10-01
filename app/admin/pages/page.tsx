import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { isLayerType, sanitizeProps } from "@/lib/uibuilder";
import { ServerLayerRenderer } from "@/components/layer-renderer";
import { pageVars } from "@/lib/uibuilder";
import { CoverField } from "@/components/media-picker";

async function add(form: FormData) {
  "use server";
  await requireTeam();
  const slug = String(form.get("slug") || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const type = String(form.get("type") || "text");
  if (!slug || !isLayerType(type)) return;
  const max = (getDb().prepare("SELECT COALESCE(MAX(ord),-1) m FROM PageBlock WHERE pageSlug=?").get(slug) as { m: number }).m;
  const props = sanitizeProps(type, {
    title: form.get("title"), body: form.get("body"),
    image: form.get("image"), link: form.get("link"),
  });
  getDb().prepare("INSERT INTO PageBlock (pageSlug, ord, type, title, body, props) VALUES (?,?,?,?,?,?)").run(
    slug, max + 1, type, String(form.get("title") || "").slice(0, 160),
    String(form.get("body") || "").slice(0, 8000), JSON.stringify(props));
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${slug}`);
}

async function edit(form: FormData) {
  "use server";
  await requireTeam();
  const id = Number(form.get("id"));
  const cur = getDb().prepare("SELECT pageSlug, type FROM PageBlock WHERE id=?").get(id) as
    { pageSlug: string; type: string } | undefined;
  if (!cur) return;
  const props = sanitizeProps(cur.type, {
    title: form.get("title"), body: form.get("body"),
    image: form.get("image"), link: form.get("link"),
  });
  getDb().prepare("UPDATE PageBlock SET title=?, body=?, props=? WHERE id=?").run(
    String(form.get("title") || "").slice(0, 160), String(form.get("body") || "").slice(0, 8000),
    JSON.stringify(props), id);
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${cur.pageSlug}`);
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

async function saveVar(form: FormData) {
  "use server";
  await requireTeam();
  const slug = String(form.get("slug") || "");
  const name = String(form.get("name") || "").replace(/[^a-zA-Z0-9_]+/g, "").slice(0, 40);
  if (!slug || !name) return;
  getDb().prepare("INSERT INTO PageVar (pageSlug, name, value) VALUES (?,?,?) ON CONFLICT(pageSlug, name) DO UPDATE SET value=excluded.value")
    .run(slug, name, String(form.get("value") || "").slice(0, 500));
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${slug}`);
}

async function removeVar(form: FormData) {
  "use server";
  await requireTeam();
  const slug = String(form.get("slug") || "");
  getDb().prepare("DELETE FROM PageVar WHERE pageSlug=? AND name=?").run(slug, String(form.get("name") || ""));
  revalidatePath("/admin/pages");
  revalidatePath(`/p/${slug}`);
}

const TYPES = ["hero", "features", "cards", "image", "markdown", "stats", "cta", "faq", "divider", "spacer", "text"] as const;

export default async function PagesAdmin() {
  const blocks = getDb().prepare("SELECT * FROM PageBlock ORDER BY pageSlug, ord LIMIT 200").all() as
    { id: number; pageSlug: string; ord: number; type: string; title: string; body: string; props: string }[];
  const allVars = getDb().prepare("SELECT pageSlug, name, value FROM PageVar ORDER BY pageSlug, name LIMIT 200").all() as
    { pageSlug: string; name: string; value: string }[];
  const pages = [...new Set(blocks.map((b) => b.pageSlug))];
  return (
    <>
      <h1 className="text-2xl font-extrabold">UI Builder (pages)</h1>
      <p className="mt-1 text-sm text-zinc-500">Compose public pages from registry layers with variables. Renders at <code>/p/[slug]</code>. Body lines for cards/stats/faq use <code>Label | /link-or-value</code>. Variables: <code>{"{{year}} {{siteName}} {{phone}}"}</code> plus page vars.</p>
      <form action={add} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-3">
          <input name="slug" required placeholder="page slug" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select name="type" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20">
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input name="title" placeholder="Title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <textarea name="body" rows={3} placeholder="Body (one feature/line; cards/stats/faq: Label | link-or-value)" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <div className="grid gap-2 md:grid-cols-2">
          <input name="image" placeholder="Image URL (image layer)" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="link" placeholder="CTA link (cta layer, default /contact)" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add layer</button>
      </form>
      {pages.map((slug) => {
        const vars = allVars.filter((v) => v.pageSlug === slug);
        return (
          <div key={slug} className="mt-4">
            <p className="font-bold">/{`p/${slug}`} <a className="ml-2 text-xs font-semibold underline" href={`/p/${slug}`}>preview →</a></p>
            <ul className="mt-1 space-y-2 text-sm">
              {blocks.filter((b) => b.pageSlug === slug).map((b) => (
                <li key={b.id} className="rounded-xl border border-black/10 p-2 dark:border-white/10">
                  <form action={edit} className="grid gap-1">
                    <input type="hidden" name="id" value={b.id} />
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{b.type}</b>
                      <input name="title" defaultValue={b.title} placeholder="Title" maxLength={160}
                        className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                    </div>
                    <textarea name="body" defaultValue={b.body} rows={2}
                      className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20" />
                    {(b.type === "image" || b.type === "cta") && (
                      <div className="grid gap-1 md:grid-cols-2">
                        {b.type === "image" && <CoverField name="image" initial={(() => { try { return (JSON.parse(b.props || "{}") as { image?: string }).image ?? ""; } catch { return ""; } })()} />}
                        {b.type === "cta" && <input name="link" defaultValue={(() => { try { return (JSON.parse(b.props || "{}") as { link?: string }).link ?? ""; } catch { return ""; } })()} placeholder="CTA link"
                          className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />}
                      </div>
                    )}
                    <span className="flex flex-wrap gap-1">
                      <button className="min-h-[44px] rounded-xl bg-brand px-4 text-xs font-semibold text-white">Save</button>
                      <button formAction={move} name="dir" value="up" aria-label="Move up" className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">↑</button>
                      <button formAction={move} name="dir" value="down" aria-label="Move down" className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">↓</button>
                      <button formAction={remove} className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Del</button>
                    </span>
                  </form>
                </li>
              ))}
            </ul>
            <details className="mt-2">
              <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-deep">Page variables ({vars.length})</summary>
              <ul className="mt-1 space-y-1 text-sm">
                {vars.map((v) => (
                  <li key={v.name} className="flex items-center gap-2">
                    <code>{`{{${v.name}}}`}</code> = {v.value}
                    <form action={removeVar}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="name" value={v.name} />
                      <button className="p-2 text-xs opacity-60 hover:opacity-100">✕</button></form>
                  </li>
                ))}
              </ul>
              <form action={saveVar} className="mt-1 flex max-w-md gap-1">
                <input type="hidden" name="slug" value={slug} />
                <input name="name" required placeholder="name" maxLength={40} className="min-h-[44px] w-32 rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                <input name="value" placeholder="value" maxLength={500} className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                <button className="min-h-[44px] rounded-lg border border-black/15 px-3 dark:border-white/20">Set</button>
              </form>
            </details>
            <details className="mt-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-deep">Live preview</summary>
              <ServerLayerRenderer layers={blocks.filter((bb) => bb.pageSlug === slug)} vars={pageVars(vars)} />
            </details>
          </div>
        );
      })}
      {pages.length === 0 && <p className="mt-2 text-sm text-zinc-500">No composed pages yet.</p>}
    </>
  );
}
