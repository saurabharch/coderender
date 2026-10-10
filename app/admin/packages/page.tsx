import Link from "next/link";
import { revalidatePath } from "next/cache";
import { categories, createPlan, createService, deletePlan, deleteService, listPlans, listServices, updatePlan, updateService } from "@/lib/catalog";
import { normBadge, normOfferMode } from "@/lib/catalog-core";
import { requireTeam } from "@/lib/auth";
import { ServicePicker } from "@/components/service-picker";
import { PlanOfferFields } from "@/components/plan-offer-fields";

const R = "/admin/packages";

async function svcCreate(form: FormData) {
  "use server";
  await requireTeam();
  createService({
    title: String(form.get("title") || ""), tagline: String(form.get("tagline") || ""),
    category: String(form.get("category") || "growth"), description: String(form.get("description") || ""),
    notes: String(form.get("notes") || ""),
  });
  revalidatePath(R);
}

async function svcUpdate(form: FormData) {
  "use server";
  await requireTeam();
  updateService(Number(form.get("id")), {
    title: String(form.get("title") || ""), tagline: String(form.get("tagline") || ""),
    category: String(form.get("category") || ""), description: String(form.get("description") || ""),
    notes: String(form.get("notes") || ""), active: !!form.get("active"),
  });
  revalidatePath(R);
}

async function svcDelete(form: FormData) {
  "use server";
  await requireTeam();
  deleteService(Number(form.get("id")));
  revalidatePath(R);
}

async function planCreate(form: FormData) {
  "use server";
  await requireTeam();
  createPlan({
    name: String(form.get("name") || ""), price: Number(form.get("price") || 0),
    per: String(form.get("per") || "one-time"), timeline: String(form.get("timeline") || ""),
    serviceSlug: String(form.get("serviceSlug") || "custom"), bestFor: String(form.get("bestFor") || ""),
    notes: String(form.get("notes") || ""), details: String(form.get("details") || ""),
    includes: String(form.get("includes") || "").split("\n").map((s) => s.trim()).filter(Boolean),
    serviceIds: form.getAll("serviceIds").map(Number).filter((n) => n > 0),
    priceLabel: String(form.get("priceLabel") || "price"),
    mrp: Number(form.get("mrp") || 0),
    offerMode: normOfferMode(String(form.get("offerMode") || "off")),
    offerValue: Number(form.get("offerValue") || 0),
    offerLabel: String(form.get("offerLabel") || "offer price"),
    badge: normBadge(String(form.get("badge") || "none")),
    offerStartsAt: String(form.get("offerStartsAt") || ""),
    offerEndsAt: String(form.get("offerEndsAt") || ""),
  });
  revalidatePath(R);
}

async function planUpdate(form: FormData) {
  "use server";
  await requireTeam();
  updatePlan(Number(form.get("id")), {
    name: String(form.get("name") || ""), price: Number(form.get("price") || 0),
    per: String(form.get("per") || "one-time"), timeline: String(form.get("timeline") || ""),
    serviceSlug: String(form.get("serviceSlug") || ""), bestFor: String(form.get("bestFor") || ""),
    notes: String(form.get("notes") || ""), details: String(form.get("details") || ""),
    includes: String(form.get("includes") || "").split("\n").map((s) => s.trim()).filter(Boolean),
    active: !!form.get("active"),
    serviceIds: form.getAll("serviceIds").map(Number).filter((n) => n > 0),
    priceLabel: String(form.get("priceLabel") || "price"),
    mrp: Number(form.get("mrp") || 0),
    offerMode: normOfferMode(String(form.get("offerMode") || "off")),
    offerValue: Number(form.get("offerValue") || 0),
    offerLabel: String(form.get("offerLabel") || "offer price"),
    badge: normBadge(String(form.get("badge") || "none")),
    offerStartsAt: String(form.get("offerStartsAt") || ""),
    offerEndsAt: String(form.get("offerEndsAt") || ""),
  });
  revalidatePath(R);
}

async function planDelete(form: FormData) {
  "use server";
  await requireTeam();
  deletePlan(Number(form.get("id")));
  revalidatePath(R);
}


export default async function PackagesAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; cat?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "plans" ? "plans" : "services";
  const cats = categories();
  const services = listServices(sp.cat || undefined);
  const plans = listPlans();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Plans & services</h1>
      <p className="mt-1 text-sm text-zinc-500">Service catalog feeds plans; plans feed bot answers. Prices are DRAFT until verified with the client.</p>
      <nav className="mt-3 flex gap-2" aria-label="Catalog">
        {(["services", "plans"] as const).map((t) => (
          <Link key={t} href={`/admin/packages?tab=${t}`}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold capitalize ${t === tab ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>{t}</Link>
        ))}
      </nav>

      {tab === "services" && (
        <>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <Link href="/admin/packages?tab=services" className={`min-h-[44px] rounded-full px-3 py-2 font-semibold ${!sp.cat ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>All</Link>
            {cats.map((c) => (
              <Link key={c.category} href={`/admin/packages?tab=services&cat=${encodeURIComponent(c.category)}`}
                className={`min-h-[44px] rounded-full px-3 py-2 font-semibold ${sp.cat === c.category ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>{c.category} ({c.n})</Link>
            ))}
          </div>
          <form action={svcCreate} className="mt-3 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="grid gap-2 md:grid-cols-2">
              <input name="title" required placeholder="Service title" maxLength={120} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input name="category" placeholder="category (e.g. visibility)" maxLength={40} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            </div>
            <input name="tagline" placeholder="Tagline" maxLength={200} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <textarea name="description" rows={2} placeholder="Description" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
            <textarea name="notes" rows={2} placeholder="Internal notes" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
            <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add service</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
                <form action={svcUpdate} className="grid gap-1">
                  <input type="hidden" name="id" value={s.id} />
                  <div className="grid gap-1 md:grid-cols-3">
                    <input name="title" defaultValue={s.title} maxLength={120} className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                    <input name="category" defaultValue={s.category} maxLength={40} className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                    <label className="flex min-h-[44px] items-center gap-1 text-xs"><input type="checkbox" name="active" value="1" defaultChecked={!!s.active} className="h-4 w-4" /> live</label>
                  </div>
                  <input name="tagline" defaultValue={s.tagline} maxLength={200} placeholder="Tagline" className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                  <textarea name="description" defaultValue={s.description} rows={2} placeholder="Description" className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20" />
                  <textarea name="notes" defaultValue={s.notes} rows={1} placeholder="Notes" className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20" />
                  <span className="flex gap-1">
                    <button className="min-h-[44px] rounded-xl bg-brand px-4 text-xs font-semibold text-white">Save</button>
                    <button formAction={svcDelete} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
                  </span>
                </form>
              </li>
            ))}
            {services.length === 0 && <li className="text-zinc-500">No services in this category.</li>}
          </ul>
        </>
      )}

      {tab === "plans" && (
        <>
          <form action={planCreate} className="mt-3 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="grid gap-2 md:grid-cols-2">
              <input name="name" required placeholder="Plan name" maxLength={120} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input name="serviceSlug" placeholder="service slug (e.g. local-seo)" maxLength={60} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input id="plan-new-price" name="price" inputMode="numeric" placeholder="₹ price" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input name="per" placeholder="per (one-time, /mo)" maxLength={30} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input name="timeline" placeholder="timeline" maxLength={60} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            </div>
            <PlanOfferFields priceInputId="plan-new-price" />
            <textarea name="includes" rows={2} placeholder="Includes (one per line)" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
            <input name="bestFor" placeholder="Best for" maxLength={200} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <textarea name="details" rows={2} placeholder="Detailing" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
            <textarea name="notes" rows={1} placeholder="Internal notes" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
            <ServicePicker services={listServices().map((s) => ({ id: s.id, title: s.title, category: s.category }))} />
            <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add plan</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {plans.map((p) => (
              <li key={p.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
                <form action={planUpdate} className="grid gap-1">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="grid gap-1 md:grid-cols-3">
                    <input name="name" defaultValue={p.name} maxLength={120} className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                    <input id={`plan-${p.id}-price`} name="price" inputMode="numeric" defaultValue={p.price} className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
                    <label className="flex min-h-[44px] items-center gap-1 text-xs"><input type="checkbox" name="active" value="1" defaultChecked={!!p.active} className="h-4 w-4" /> live</label>
                  </div>
                  <PlanOfferFields priceInputId={`plan-${p.id}-price`}
                    initial={{ price: p.price, priceLabel: p.priceLabel, mrp: p.mrp, offerMode: p.offerMode, offerValue: p.offerValue, offerLabel: p.offerLabel, badge: p.badge, offerStartsAt: p.offerStartsAt, offerEndsAt: p.offerEndsAt }} />
                  <div className="flex flex-wrap gap-1">
                    {p.services.map((s) => <span key={s.id} className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand-deep">{s.title}</span>)}
                    {p.services.length === 0 && <span className="text-xs text-zinc-500">no linked services</span>}
                  </div>
                  <textarea name="details" defaultValue={p.details} rows={2} placeholder="Detailing" className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20" />
                  <textarea name="notes" defaultValue={p.notes} rows={1} placeholder="Notes" className="rounded-lg border border-black/15 bg-transparent px-2 py-1 dark:border-white/20" />
                  <ServicePicker services={listServices().map((s) => ({ id: s.id, title: s.title, category: s.category }))} selected={p.services.map((s) => s.id)} />
                  <span className="flex gap-1">
                    <button className="min-h-[44px] rounded-xl bg-brand px-4 text-xs font-semibold text-white">Save</button>
                    <button formAction={planDelete} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button>
                  </span>
                </form>
              </li>
            ))}
            {plans.length === 0 && <li className="text-zinc-500">No plans yet.</li>}
          </ul>
        </>
      )}
    </>
  );
}
