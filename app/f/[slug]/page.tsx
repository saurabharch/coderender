import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";

interface Field { name: string; label: string; type: string; required?: boolean }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getDb().prepare("SELECT title FROM FormDef WHERE slug=? AND active=1").get(slug) as { title: string } | undefined;
  return { title: f ? `${f.title} — CodeRender` : "Form — CodeRender" };
}

export default async function DynamicForm({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getDb().prepare("SELECT * FROM FormDef WHERE slug=? AND active=1").get(slug) as
    { id: number; title: string; fields: string } | undefined;
  if (!f) notFound();
  const fields = JSON.parse(f.fields) as Field[];
  return (
    <div className="wrap section max-w-xl">
      <h1 className="display-1">{f.title}</h1>
      <form action="/api/forms/submit" method="post" className="mt-6 grid gap-3">
        <input type="hidden" name="slug" value={slug} />
        {fields.map((fd) => (
          <label key={fd.name} className="grid gap-1 text-sm">{fd.label}
            {fd.type === "textarea"
              ? <textarea name={fd.name} required={fd.required} rows={4} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
              : <input name={fd.name} type={fd.type || "text"} required={fd.required} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />}
          </label>
        ))}
        <button className="beam beam-rainbow btn-dark min-h-[44px] rounded-full px-6 text-sm font-semibold">Submit →</button>
      </form>
    </div>
  );
}
