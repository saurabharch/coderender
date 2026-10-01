import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteSubmission, getFormById, listSubmissions, getSubmission } from "@/lib/forms";
import { requireTeam } from "@/lib/auth";

async function remove(formId: number, subId: number) {
  "use server";
  await requireTeam();
  await deleteSubmission(formId, subId);
  revalidatePath(`/admin/forms/${formId}/submissions`);
}

export default async function SubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = getFormById(Number(id));
  if (!form) notFound();
  const subs = listSubmissions(form.id, 100);
  return (
    <>
      <Link href="/admin/forms" className="text-sm font-semibold text-brand-deep">← All forms</Link>
      <h1 className="mt-1 text-2xl font-extrabold">Submissions: {form.title}</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">/f/{form.slug} · {subs.length} shown</p>
      <ul className="mt-4 space-y-2">
        {subs.map((s) => {
          const full = getSubmission(form.id, s.id);
          return (
            <li key={s.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-sm">#{s.id}</b>
                <span className="font-mono text-xs text-zinc-500">{s.submittedAt.slice(0, 16).replace("T", " ")}</span>
                <form action={remove.bind(null, form.id, s.id)} className="ml-auto">
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
                </form>
              </div>
              <pre className="mt-2 overflow-auto rounded-xl bg-black/5 p-2 font-mono text-xs dark:bg-white/10">{JSON.stringify(full?.data ?? {}, null, 2).slice(0, 2000)}</pre>
            </li>
          );
        })}
        {subs.length === 0 && <li className="text-sm text-zinc-500">No submissions yet. Share <code>/f/{form.slug}</code>.</li>}
      </ul>
    </>
  );
}
