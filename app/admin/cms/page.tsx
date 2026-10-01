import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { CONTENT_TYPES } from "@/lib/cms-schemas";
import { coerceForm, createItem, deleteItem, fieldsFor, listItems, updateItem, countByType } from "@/lib/cms";
import { GeneratedForm } from "@/components/generated-form";

async function createFor(type: string, form: FormData) {
  "use server";
  await requireTeam();
  await createItem(type, coerceForm(type, form));
  revalidatePath("/admin/cms");
}

async function updateFor(type: string, id: number, form: FormData) {
  "use server";
  await requireTeam();
  await updateItem(type, id, coerceForm(type, form));
  revalidatePath("/admin/cms");
}

async function deleteFor(type: string, id: number) {
  "use server";
  await requireTeam();
  await deleteItem(type, id);
  revalidatePath("/admin/cms");
}

async function saveLegacy(form: FormData) {
  "use server";
  await requireTeam();
  const key = String(form.get("key") || "").toLowerCase().replace(/[^a-z0-9:_\-]+/g, "-").slice(0, 120);
  if (!key) return;
  getDb().prepare("INSERT INTO ContentBlock (key, title, body, published) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET title=excluded.title, body=excluded.body, published=excluded.published")
    .run(key, String(form.get("title") || "").slice(0, 160), String(form.get("body") || "").slice(0, 20000), form.get("published") ? 1 : 0);
  revalidatePath("/admin/cms");
}

export default async function CmsAdmin({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const slugs = CONTENT_TYPES.map((t) => t.slug);
  const active = slugs.includes(sp.type as (typeof slugs)[number]) ? (sp.type as string) : "announcement";
  const counts = countByType();
  const items = listItems(active, 100, { withRelated: true });
  const createFields = fieldsFor(active) ?? [];
  const legacy = getDb().prepare("SELECT * FROM ContentBlock ORDER BY key LIMIT 100").all() as
    { key: string; title: string; body: string; published: number }[];

  return (
    <>
      <h1 className="text-2xl font-extrabold">CMS</h1>
      <p className="mt-1 text-sm text-zinc-500">Code-defined types, generated forms. Announcements feed the header banner; pages/FAQs/highlights render where wired.</p>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Content types">
        {CONTENT_TYPES.map((t) => (
          <Link key={t.slug} href={`/admin/cms?type=${t.slug}`}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold ${t.slug === active ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {t.name}{counts[t.slug] ? ` (${counts[t.slug]})` : ""}
          </Link>
        ))}
      </nav>

      <section className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="font-bold">New {active}</h2>
        <p className="mb-3 text-xs text-zinc-500">{CONTENT_TYPES.find((t) => t.slug === active)?.description}</p>
        <GeneratedForm fields={createFields} action={createFor.bind(null, active)} submitLabel={`Create ${active}`} />
      </section>

      <ul className="mt-4 space-y-2">
        {items.map((it) => {
          const label = String(
            (it.data.title as string) ?? (it.data.name as string) ?? (it.data.question as string) ??
            (it.data.text as string) ?? `#${it.id}`);
          const rel = it.related?.categoryId && typeof it.related.categoryId === "object"
            ? String((it.related.categoryId as Record<string, unknown>).name ?? "") : "";
          return (
            <li key={it.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">{label.slice(0, 120)}</b>
                <span className="text-xs text-zinc-500">{it.published ? "live" : "draft"} · #{it.id}{rel ? ` · ${rel}` : ""}</span>
                <form action={deleteFor.bind(null, active, it.id)} className="ml-auto">
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
                </form>
              </div>
              <details className="mt-2">
                <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-deep">Edit</summary>
                <div className="mt-2">
                  <GeneratedForm
                    fields={fieldsFor(active, it.data) ?? []}
                    action={updateFor.bind(null, active, it.id)}
                    submitLabel="Save changes" />
                </div>
              </details>
            </li>
          );
        })}
        {items.length === 0 && <li className="text-sm text-zinc-500">No {active} yet — create the first above.</li>}
      </ul>

      <section className="mt-8">
        <h2 className="font-bold">Legacy blocks</h2>
        <p className="mt-1 text-sm text-zinc-500">Keys drive live slots. <code>page:</code> keys render at <code>/p/[slug]</code>. Typed announcements take precedence over the legacy <code>announcement</code> key.</p>
        <form action={saveLegacy} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <div className="grid gap-2 md:grid-cols-2">
            <input name="key" required placeholder="key (e.g. announcement or page:offer)" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <input name="title" placeholder="Title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          </div>
          <textarea name="body" rows={4} placeholder="Body text" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
          <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="published" value="1" defaultChecked className="h-5 w-5" /> Published</label>
          <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save block</button>
        </form>
        <ul className="mt-4 space-y-1 font-mono text-xs">
          {legacy.map((r) => <li key={r.key} className="rounded-xl border border-black/10 p-2 dark:border-white/10"><b>{r.key}</b> · {r.published ? "live" : "draft"} · {(r.title || r.body).slice(0, 100)}</li>)}
        </ul>
      </section>
    </>
  );
}
