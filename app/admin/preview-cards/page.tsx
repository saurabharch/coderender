import { notFound } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { PlanPrice, type PriceBlock } from "@/components/plan-price";

// TEMPORARY prototype preview (deleted after the owner reacts): every
// price state with mock data — nothing here persists, nothing is real.
const STATES: { label: string; p: PriceBlock }[] = [
  { label: "1 · plain (no offer — today's look)", p: { price: 4999, per: "one-time" } },
  { label: "2 · custom label (actual price)", p: { price: 29999, per: "one-time", priceLabel: "actual price" } },
  { label: "3 · MRP strike + flat offer + badge", p: { price: 14999, per: "one-time", priceLabel: "total price", mrp: 19999, offerMode: "flat", offerValue: 2000, offerLabel: "discount price", badge: "offer" } },
  { label: "4 · % offer + new-price badge + /mo", p: { price: 11999, per: "/mo", mrp: 15999, offerMode: "pct", offerValue: 25, offerLabel: "offer price", badge: "new-price" } },
  { label: "5 · badge only (new, no price change)", p: { price: 7999, per: "one-time", badge: "new" } },
  { label: "6 · scheduled upcoming (renders plain until 2099)", p: { price: 9999, per: "one-time", mrp: 12999, offerMode: "pct", offerValue: 20, offerLabel: "offer price", badge: "offer", offerStartsAt: "2099-01-01T00:00:00Z" } },
  { label: "7 · scheduled expired (renders plain after end)", p: { price: 9999, per: "one-time", mrp: 12999, offerMode: "pct", offerValue: 20, offerLabel: "offer price", badge: "offer", offerStartsAt: "2020-01-01T00:00:00Z", offerEndsAt: "2020-02-01T00:00:00Z" } },
];

export default async function PreviewCardsPage() {
  const me = await sessionUser();
  if (!me || me.role !== "owner") notFound();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Card prototype — react, then I delete this page</h1>
      <p className="mt-1 text-sm text-zinc-500">Mock data only. Tell me which states to keep/change: strike shade, shimmer speed, badge words/colors, beam border on offers.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {STATES.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{s.label}</p>
            <p className="mt-2 font-bold">Mock Growth Pack</p>
            <PlanPrice p={s.p} />
            <p className="mt-2 text-sm text-zinc-500">Best for reacting · timeline whenever</p>
          </div>
        ))}
      </div>
    </>
  );
}
