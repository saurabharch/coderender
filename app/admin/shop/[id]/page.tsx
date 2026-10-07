import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { commerceTables, getProductFull, listLots, listPrices } from "@/lib/commerce";
import { inventoryTables, stockMoves } from "@/lib/inventory";
import { retailTables } from "@/lib/retail";
import { AdminCard, Empty, PageHead } from "@/components/admin-ui";
import { StatusBadge } from "@/components/admin-ux";
import { NoSsr } from "@/components/no-ssr";
import { Sparkline } from "@mantine/charts";
import { BundleEditor } from "@/components/bundle-editor";

const TABS = [
  ["overview", "Overview"],
  ["sales", "Sales"],
  ["stock", "Stock & batches"],
  ["engagement", "Carts & reach"],
] as const;

type Tab = (typeof TABS)[number][0];

export default async function ProductDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }>;
}) {
  await requireTeam();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.some(([t]) => t === sp.tab) ? sp.tab : "overview") as Tab;
  const pid = Number(id);
  if (!pid) notFound();

  commerceTables();
  inventoryTables();
  retailTables();
  const full = getProductFull(pid);
  if (!full) notFound();
  const p = full.product as Record<string, unknown>;
  const db = getDb();
  const images = JSON.parse(String(p.images ?? "[]")) as string[];
  const ym = () => new Date().toISOString().slice(0, 7);

  const href = (t: Tab) => `/admin/shop/${pid}${t === "overview" ? "" : `?tab=${t}`}`;
  const tabbar = (
    <nav aria-label="Product sections" className="mt-3 flex flex-wrap gap-1.5">
      {TABS.map(([t, label]) => (
        <Link key={t} href={href(t)} aria-current={t === tab ? "page" : undefined}
          className={`flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${t === tab ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );

  if (tab === "sales") {
    const totals = db.prepare(`SELECT COALESCE(SUM(l.qty),0) q, COALESCE(SUM(l.total),0) s, COUNT(DISTINCT l.orderId) o
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId WHERE l.productId=? AND o.status!='cancelled'`).get(pid) as
      { q: number; s: number; o: number };
    const daily = db.prepare(`SELECT date(o.createdAt) d, COALESCE(SUM(l.qty),0) q, COALESCE(SUM(l.total),0) s
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId
      WHERE l.productId=? AND o.status!='cancelled' AND o.createdAt >= date('now','-14 days')
      GROUP BY d ORDER BY d`).all(pid) as { d: string; q: number; s: number }[];
    const weekly = db.prepare(`SELECT strftime('%Y-W%W', o.createdAt) w, COALESCE(SUM(l.qty),0) q, COALESCE(SUM(l.total),0) s
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId
      WHERE l.productId=? AND o.status!='cancelled' AND o.createdAt >= date('now','-56 days')
      GROUP BY w ORDER BY w`).all(pid) as { w: string; q: number; s: number }[];
    const monthly = db.prepare(`SELECT substr(o.createdAt,1,7) m, COALESCE(SUM(l.qty),0) q, COALESCE(SUM(l.total),0) s
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId
      WHERE l.productId=? AND o.status!='cancelled' AND o.createdAt >= date('now','-6 months')
      GROUP BY m ORDER BY m`).all(pid) as { m: string; q: number; s: number }[];
    const yearly = db.prepare(`SELECT strftime('%Y', o.createdAt) y, COALESCE(SUM(l.qty),0) q, COALESCE(SUM(l.total),0) s
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId
      WHERE l.productId=? AND o.status!='cancelled' GROUP BY y ORDER BY y`).all(pid) as
      { y: string; q: number; s: number }[];
    const recent = db.prepare(`SELECT o.id, o.status, substr(o.createdAt,1,10) at, l.qty, l.total
      FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId WHERE l.productId=? ORDER BY o.id DESC LIMIT 5`).all(pid) as
      { id: number; status: string; at: string; qty: number; total: number }[];
    const rev14 = daily.map((d) => Math.round(d.s / 100));
    const qty14 = daily.map((d) => d.q);
    const bucket = (title: string, rows: { k: string; q: number; s: number }[], empty: string) => (
      <AdminCard>
        <p className="font-bold">{title}</p>
        {rows.length === 0 ? <div className="mt-2"><Empty>{empty}</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {rows.map((r) => (
              <li key={r.k} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="font-mono">{r.k}</span>
                <span>{r.q} pcs · <b>₹{(r.s / 100).toFixed(0)}</b></span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    );
    return (
      <>
        <PageHead eyebrow={`Product #${pid}`} title={String(p.name ?? "Product")} blurb="Sales analytics for this product." />
        {tabbar}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[["Revenue", `₹${(totals.s / 100).toFixed(0)}`], ["Units sold", String(totals.q)], ["Orders", String(totals.o)]].map(([l, v]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{l}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <AdminCard>
            <p className="font-bold">Revenue — 14 days (₹)</p>
            <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
              {rev14.some((v) => v > 0)
                ? <Sparkline data={rev14} w={260} h={60} color="teal" curveType="monotone" mt="md" />
                : <p className="mt-2 text-sm text-zinc-500">No sales in the last 14 days.</p>}
            </NoSsr>
          </AdminCard>
          <AdminCard>
            <p className="font-bold">Units — 14 days</p>
            <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
              {qty14.some((v) => v > 0)
                ? <Sparkline data={qty14} w={260} h={60} color="brand" curveType="monotone" mt="md" />
                : <p className="mt-2 text-sm text-zinc-500">No sales in the last 14 days.</p>}
            </NoSsr>
          </AdminCard>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {bucket("Day-wise (14d)", daily.map((d) => ({ k: d.d, q: d.q, s: d.s })), "No sales in the last 14 days.")}
          {bucket("Week-wise (8w)", weekly.map((d) => ({ k: d.w, q: d.q, s: d.s })), "No sales in the last 8 weeks.")}
          {bucket("Month-wise (6m)", monthly.map((d) => ({ k: d.m, q: d.q, s: d.s })), "No sales in the last 6 months.")}
          {bucket("Year-wise", yearly.map((d) => ({ k: d.y, q: d.q, s: d.s })), "No sales yet.")}
        </div>
        <AdminCard>
          <p className="font-bold">Recent orders with this product</p>
          {recent.length === 0 ? <div className="mt-2"><Empty>No orders yet.</Empty></div> : (
            <ul className="mt-2 space-y-1 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span>Order #{r.id} · {r.at} · {r.qty} pcs · <b>₹{(r.total / 100).toFixed(0)}</b></span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </>
    );
  }

  if (tab === "stock") {
    const levels = db.prepare(`SELECT w.name wh, COALESCE(s.qty, p.stock, 0) qty FROM Product p
      LEFT JOIN StockLevel s ON s.productId=p.id LEFT JOIN Warehouse w ON w.id=s.warehouseId WHERE p.id=?`).all(pid) as
      { wh: string | null; qty: number }[];
    const { reservedQty } = await import("@/lib/inventory");
    const held = reservedQty(pid);
    const moves = stockMoves(pid, 20) as { kind: string; qty: number; ref: string; at: string }[];
    const lots = listLots(pid) as { id: number; lot: string; mfg: string; exp: string; qty: number }[];
    return (
      <>
        <PageHead eyebrow={`Product #${pid}`} title={String(p.name ?? "Product")} blurb="Ledger truth, moves and batches." />
        {tabbar}
        <AdminCard>
          <p className="font-bold">Levels by warehouse</p>
          {held > 0 && <p className="mt-1 text-sm font-semibold text-amber-600">{held} held in open drafts (auto-releases in 48h)</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {levels.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{l.wh ?? "Main"}</span><b>{l.qty}</b>
              </li>
            ))}
            {levels.length === 0 && <li className="text-zinc-500">No levels yet — first move seeds them.</li>}
          </ul>
        </AdminCard>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <AdminCard>
            <p className="font-bold">Recent moves (20)</p>
            {moves.length === 0 ? <div className="mt-2"><Empty>No ledger moves — new products log an opening move on create.</Empty></div> : (
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {moves.map((m, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                    <span>{m.kind} · {m.qty}</span><span className="text-zinc-500">{m.ref} · {String(m.at ?? "").slice(0, 16)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
          <AdminCard>
            <p className="font-bold">Batches ({lots.length})</p>
            {lots.length === 0 ? <div className="mt-2"><Empty>No batches — add mfg/expiry per lot in Shop.</Empty></div> : (
              <ul className="mt-2 space-y-1 text-sm">
                {lots.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                    <span>{l.lot || `#${l.id}`} · MFG {l.mfg || "—"} · EXP {l.exp || "—"} · {l.qty}</span>
                    {l.exp ? <StatusBadge status={l.exp < ym() ? "expired" : "active"} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </>
    );
  }

  if (tab === "engagement") {
    const views30 = (db.prepare("SELECT COUNT(*) c FROM ProductView WHERE productId=? AND at >= date('now','-30 days')").get(pid) as { c: number }).c;
    const wish = (db.prepare("SELECT COUNT(*) c FROM Wishlist WHERE productId=?").get(pid) as { c: number }).c;
    let inCarts = 0;
    try {
      const carts = db.prepare("SELECT lines FROM Cart ORDER BY id DESC LIMIT 200").all() as { lines: string }[];
      for (const c of carts) {
        const lines = JSON.parse(c.lines || "[]") as { productId: number; qty: number }[];
        if (lines.some((l) => l.productId === pid)) inCarts++;
      }
    } catch { /* corrupt cart JSON never breaks the page */ }
    const transit = (db.prepare(`SELECT COALESCE(SUM(l.qty),0) q FROM OrderLine l JOIN ShopOrder o ON o.id=l.orderId
      JOIN Shipment s ON s.orderId=o.id
      WHERE l.productId=? AND o.status!='cancelled' AND s.status NOT IN ('delivered','rto','cancelled')`).get(pid) as { q: number }).q;
    return (
      <>
        <PageHead eyebrow={`Product #${pid}`} title={String(p.name ?? "Product")} blurb="Reach: views, saves, carts and units on the road." />
        {tabbar}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Views · 30d", String(views30)], ["In wishlists", String(wish)], ["In carts", String(inCarts)], ["In transit", String(transit)]].map(([l, v]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{l}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Rating {String((p.ratingAvg as number) ?? 0)} from {String((p.ratingCount as number) ?? 0)} reviews.</p>
      </>
    );
  }

  const variants = full.variants as { id: number; name: string; attrs: string; price: number; stock: number }[];
  const prices = listPrices(pid) as { priceType: string; amount: number }[];
  const similar = full.similar as { id: number; name: string; price: number }[];
  const specs = (() => { try { return JSON.parse(String(p.specs ?? "{}")) as Record<string, string>; } catch { return {}; } })();
  return (
    <>
      <PageHead eyebrow={`Product #${pid}`} title={String(p.name ?? "Product")} blurb={String(p.shortDesc ?? "") || "Catalogue detail."} />
      {tabbar}
      <div className="mt-3 flex flex-wrap gap-3">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt={String(p.name)} className="h-32 w-32 rounded-2xl object-cover" />
        ) : <span className="flex h-32 w-32 items-center justify-center rounded-2xl bg-black/5 text-xs dark:bg-white/10">no image</span>}
        <div className="grid min-w-[200px] flex-1 content-start gap-1 text-sm">
          <p className="text-2xl font-extrabold">₹{(Number(p.price ?? 0) / 100).toFixed(0)}
            {Number(p.mrp ?? 0) > Number(p.price ?? 0) && <span className="ml-2 text-sm font-normal text-zinc-500 line-through">₹{(Number(p.mrp) / 100).toFixed(0)}</span>}</p>
          <p className="flex flex-wrap items-center gap-1.5">
            {p.category ? <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{String(p.category)}</span> : null}
            <StatusBadge status={String(p.status ?? "active")} />
            <span className="text-zinc-500">stock {String(p.stock ?? 0)}</span>
          </p>
          <p className="font-mono text-xs text-zinc-500">{String(p.barcode ?? "")} · {String(p.sku ?? "")}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <AdminCard>
          <p className="font-bold">Variants ({variants.length})</p>
          {variants.length === 0 ? <div className="mt-2"><Empty>No variants — add size/color + price in Shop.</Empty></div> : (
            <ul className="mt-2 space-y-1 text-sm">
              {variants.map((v) => (
                <li key={v.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span className="min-w-0 truncate">{v.name}</span>
                  <span>₹{(v.price / 100).toFixed(0)} · {v.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
        <AdminCard>
          <p className="font-bold">Price tiers</p>
          {prices.length === 0 ? <div className="mt-2"><Empty>No overrides — base price applies everywhere.</Empty></div> : (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {prices.map((x, i) => <li key={i} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">{x.priceType} ₹{(x.amount / 100).toFixed(0)}</li>)}
            </ul>
          )}
          {Object.keys(specs).length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {Object.entries(specs).map(([k, v]) => <li key={k} className="flex justify-between gap-2"><span className="text-zinc-500">{k}</span><span>{v}</span></li>)}
            </ul>
          )}
        </AdminCard>
      </div>
      {similar.length > 0 && (
        <AdminCard>
          <p className="font-bold">Similar</p>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {similar.map((s) => <li key={s.id}><Link href={`/admin/shop/${s.id}`} className="block min-h-[44px] rounded-xl border border-black/15 px-3 py-2 dark:border-white/20">{s.name} · ₹{(s.price / 100).toFixed(0)}</Link></li>)}
          </ul>
        </AdminCard>
      )}
      <AdminCard>
        <p className="font-bold">Kit <span className="text-xs font-normal text-zinc-500">(bundle components — stock moves at parts)</span></p>
        <div className="mt-2"><BundleEditor bundleId={pid} /></div>
      </AdminCard>
      <p className="mt-3"><Link href="/admin/shop" className="font-semibold text-brand-deep underline">← All products</Link></p>
    </>
  );
}
