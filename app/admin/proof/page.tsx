import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function save(form: FormData) {
  "use server";
  await requireTeam();
  const name = String(form.get("name") || "").slice(0, 80);
  if (!name) return;
  getDb().prepare("INSERT INTO Testimonial (name, business, beforeTx, afterTx, published) VALUES (?,?,?,?,?)").run(
    name, String(form.get("business") || "").slice(0, 120), String(form.get("beforeTx") || "").slice(0, 500),
    String(form.get("afterTx") || "").slice(0, 500), form.get("published") ? 1 : 0);
  revalidatePath("/admin/proof");
  revalidatePath("/");
}

async function toggle(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE Testimonial SET published = 1 - published WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/proof");
  revalidatePath("/");
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("DELETE FROM Testimonial WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/proof");
  revalidatePath("/");
}

export default async function ProofAdmin() {
  const rows = getDb().prepare("SELECT * FROM Testimonial ORDER BY id DESC LIMIT 100").all() as
    { id: number; name: string; business: string; beforeTx: string; afterTx: string; published: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Proof (testimonials)</h1>
      <p className="mt-1 text-sm text-zinc-500">Only real, permissioned quotes. Published ones render on the homepage.</p>
      <form action={save} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-2 md:grid-cols-2">
          <input name="name" required placeholder="Client name" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="business" placeholder="Business + city" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <input name="beforeTx" placeholder="Before…" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input name="afterTx" placeholder="After…" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="published" value="1" defaultChecked className="h-5 w-5" /> Published</label>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save</button>
      </form>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span><b>{r.name}</b> · {r.business} · {r.published ? "live" : "draft"}<br />{r.beforeTx} → {r.afterTx}</span>
            <span className="flex gap-2">
              <form action={toggle}><input type="hidden" name="id" value={r.id} />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">{r.published ? "Unpublish" : "Publish"}</button></form>
              <form action={remove}><input type="hidden" name="id" value={r.id} />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Delete</button></form>
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-zinc-500">Empty — homepage shows marked placeholders until then.</li>}
      </ul>
    </>
  );
}
