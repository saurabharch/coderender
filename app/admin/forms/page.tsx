import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function save(form: FormData) {
  "use server";
  await requireTeam();
  const slug = String(form.get("slug") || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const title = String(form.get("title") || "").slice(0, 120);
  if (!slug || !title) return;
  try {
    const fields = JSON.parse(String(form.get("fields") || "[]"));
    if (!Array.isArray(fields)) return;
    getDb().prepare("INSERT INTO FormDef (slug, title, fields) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title, fields=excluded.fields")
      .run(slug, title, JSON.stringify(fields));
  } catch { /* bad json ignored */ }
  revalidatePath("/admin/forms");
}

export default async function FormsAdmin() {
  const forms = getDb().prepare("SELECT * FROM FormDef ORDER BY id DESC").all() as
    { id: number; slug: string; title: string; fields: string; active: number }[];
  const subs = getDb().prepare(
    "SELECT s.id, s.data, s.createdAt, f.title FROM Submission s JOIN FormDef f ON f.id=s.formId ORDER BY s.id DESC LIMIT 30").all() as
    { id: number; data: string; createdAt: string; title: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Form Builder</h1>
      <form action={save} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-2">
          <input name="title" required placeholder="Form title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="slug" required placeholder="slug" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <textarea name="fields" rows={4} defaultValue='[{"name":"name","label":"Name","type":"text","required":true},{"name":"phone","label":"Phone","type":"tel","required":true}]'
          className="rounded-xl border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20" />
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save form</button>
      </form>
      <h2 className="mt-6 font-bold">Forms</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {forms.map((f) => <li key={f.id}><a className="underline" href={`/f/${f.slug}`}>{f.title}</a> · /f/{f.slug}</li>)}
      </ul>
      <h2 className="mt-6 font-bold">Latest submissions</h2>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {subs.map((s) => <li key={s.id} className="rounded-xl border border-black/10 p-2 dark:border-white/10">{s.title} · {s.createdAt.slice(0, 16).replace("T", " ")} · {s.data.slice(0, 160)}</li>)}
      </ul>
    </>
  );
}
