import Link from "next/link";
import { revalidatePath } from "next/cache";
import { deleteForm, listForms } from "@/lib/forms";
import { requireTeam } from "@/lib/auth";

async function remove(id: number) {
  "use server";
  await requireTeam();
  await deleteForm(id);
  revalidatePath("/admin/forms");
}

export default async function FormsAdmin() {
  const forms = listForms({ limit: 100 });
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Form Builder</h1>
        <Link href="/admin/forms/new" className="ml-auto min-h-[44px] rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">+ New form</Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Design forms visually, publish at <code>/f/[slug]</code>, review validated submissions.</p>
      <ul className="mt-4 space-y-2">
        {forms.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
            <div className="min-w-0">
              <b>{f.title}</b>
              <p className="truncate font-mono text-xs text-zinc-500">/f/{f.slug} · {f.status} · {f.fields.length} fields · {f.submissions} submissions</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-1">
              <Link href={`/f/${f.slug}`} className="min-h-[44px] rounded-xl border border-black/15 px-3 py-2.5 text-xs font-semibold dark:border-white/20">View</Link>
              <Link href={`/admin/forms/${f.id}/edit`} className="min-h-[44px] rounded-xl border border-black/15 px-3 py-2.5 text-xs font-semibold dark:border-white/20">Edit</Link>
              <Link href={`/admin/forms/${f.id}/submissions`} className="min-h-[44px] rounded-xl border border-black/15 px-3 py-2.5 text-xs font-semibold dark:border-white/20">Submissions</Link>
              <form action={remove.bind(null, f.id)}>
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
              </form>
            </div>
          </li>
        ))}
        {forms.length === 0 && <li className="text-sm text-zinc-500">No forms yet — create the first above.</li>}
      </ul>
    </>
  );
}
