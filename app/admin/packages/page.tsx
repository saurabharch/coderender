import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function save(form: FormData) {
  "use server";
  await requireTeam();
  const price = Math.max(0, Math.round(Number(form.get("price") || 0)));
  getDb().prepare("UPDATE ServicePackage SET price=?, active=? WHERE id=?").run(
    price, form.get("active") ? 1 : 0, Number(form.get("id")));
  revalidatePath("/admin/packages");
}

export default async function PackagesAdmin() {
  const rows = getDb().prepare("SELECT * FROM ServicePackage ORDER BY serviceSlug, price").all() as
    { id: number; serviceSlug: string; name: string; price: number; per: string; timeline: string; active: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Service packages</h1>
      <p className="mt-1 text-sm text-zinc-500">Source of truth for bot answers. Prices are DRAFT until verified with the client.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span><b>{r.serviceSlug}</b> · {r.name} · {r.timeline} · {r.active ? "live" : "off"}</span>
            <form action={save} className="flex items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <input name="price" inputMode="numeric" defaultValue={r.price} aria-label="Price"
                className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20" />
              <label className="flex min-h-[44px] items-center gap-1 text-xs">
                <input type="checkbox" name="active" value="1" defaultChecked={!!r.active} className="h-5 w-5" /> live
              </label>
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Save</button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-zinc-500">No packages seeded yet.</li>}
      </ul>
    </>
  );
}
