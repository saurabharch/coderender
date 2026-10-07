import { revalidatePath } from "next/cache";
import { getDb, newLicenseKey, uid, hashKey, getPref, setPref } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function genLicense(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("INSERT INTO LicenseKey (product, key, maxActivations) VALUES (?,?,?)").run(
    String(form.get("product") || "default").slice(0, 80), newLicenseKey(), Number(form.get("max") || 1));
  revalidatePath("/admin/keys");
}

async function revokeLicense(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE LicenseKey SET status='revoked' WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/keys");
}

async function genApiKey(form: FormData) {
  "use server";
  await requireTeam();
  const raw = `cr_${uid(20)}`;
  getDb().prepare("INSERT INTO ApiKey (name, prefix, hash, scopes) VALUES (?,?,?,?)").run(
    String(form.get("name") || "key").slice(0, 80), raw.slice(0, 10), hashKey(raw),
    String(form.get("scopes") || "leads:write"));
  setPref("last_api_key", raw);
  revalidatePath("/admin/keys");
}

async function toggleApiKey(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE ApiKey SET active = 1 - active WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/keys");
}

export default async function KeysPage() {
  const licenses = getDb().prepare("SELECT * FROM LicenseKey ORDER BY id DESC LIMIT 100").all() as
    { id: number; product: string; key: string; status: string; activations: number; maxActivations: number }[];
  const apis = getDb().prepare("SELECT id, name, prefix, scopes, active, createdAt FROM ApiKey ORDER BY id DESC LIMIT 100").all() as
    { id: number; name: string; prefix: string; scopes: string; active: number; createdAt: string }[];
  const justMade = getPref("last_api_key", "");
  if (justMade) setPref("last_api_key", "");
  return (
    <>
      <h1 className="text-2xl font-extrabold">Api Keys <span className="text-sm font-normal text-zinc-500">(license + API)</span></h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Sell later: hand a license per purchase, verify via <code>/api/license/verify</code>.
        API keys authenticate service calls (store only the prefix + hash here).
      </p>
      <h2 className="mt-6 font-bold">Mint license</h2>
      <form action={genLicense} className="mt-2 flex flex-wrap gap-2">
        <input name="product" placeholder="product" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        <input name="max" inputMode="numeric" defaultValue="1" className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Mint</button>
      </form>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {licenses.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <span>{l.key} · {l.product} · {l.status} · {l.activations}/{l.maxActivations}</span>
            {l.status === "active" && <form action={revokeLicense}><input type="hidden" name="id" value={l.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Revoke</button></form>}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-bold">New API key (copy it once — only the hash is stored)</h2>
      <p className="mt-1 text-xs text-zinc-500">Scopes: <code>leads:write</code> · <code>agent:read</code> (board/form/cms reads) · <code>agent:write</code> (tasks, leads) · <code>shop:read</code> (catalog/orders reads) · <code>shop:write</code> (products/orders writes) · <code>admin</code> (all). Agent ops listed at <code>GET /api/agent/call</code>.</p>
      {justMade && <p className="mt-2 rounded-2xl bg-brand-soft p-3 font-mono text-xs dark:bg-white/10">New key (shown once): <b>{justMade}</b></p>}
      <form action={genApiKey} className="mt-2 flex flex-wrap gap-2">
        <input name="name" placeholder="name" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        <input name="scopes" defaultValue="leads:write" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Create</button>
      </form>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {apis.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <span>{a.prefix}… · {a.name} · {a.scopes} · {a.active ? "active" : "off"}</span>
            <form action={toggleApiKey}><input type="hidden" name="id" value={a.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Toggle</button></form>
          </li>
        ))}
      </ul>
    </>
  );
}
