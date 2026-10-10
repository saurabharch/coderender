import { planEffective } from "@/lib/catalog-core";

export interface PriceBlock {
  price: number; per?: string; priceLabel?: string; mrp?: number;
  offerMode?: string; offerValue?: number; offerLabel?: string; badge?: string;
  offerStartsAt?: string; offerEndsAt?: string;
}

const BADGE_TEXT: Record<string, string> = { new: "new", offer: "offer price", "new-price": "new price" };

// Offer-aware price block for plan cards (server-safe, no Mantine —
// public pages stay shadcn/Radix + beam/glass). No offer → today's plain
// price. Offer → struck MRP sub-text, shimmer charge, badges.
export function PlanPrice({ p }: { p: PriceBlock }) {
  const eff = planEffective({
    price: p.price, mrp: p.mrp, offerMode: p.offerMode, offerValue: p.offerValue,
    startsAt: p.offerStartsAt, endsAt: p.offerEndsAt,
  });
  const label = (p.priceLabel || "price").toLowerCase() === "price" ? null : p.priceLabel;
  const badge = BADGE_TEXT[p.badge || ""] ?? null;
  const per = p.per && p.per !== "one-time" ? ` ${p.per}` : "";
  if (!eff.onOffer && !badge) {
    return (
      <p className="mt-1 text-2xl font-extrabold">
        {label && <span className="mr-2 align-middle text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">{label}</span>}
        ₹{eff.charge}{per && <span className="text-sm font-semibold">{per}</span>}
      </p>
    );
  }
  return (
    <div className="mt-1">
      <p className="flex flex-wrap items-center gap-2">
        {badge && (
          <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white dark:bg-teal-400 dark:text-teal-950">
            {badge}
          </span>
        )}
        {eff.pctOff > 0 && (
          <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-extrabold text-brand-deep">−{eff.pctOff}%</span>
        )}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        {eff.struck > 0 && (
          <s className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">₹{eff.struck}</s>
        )}
        <span className="shimmer-text text-2xl font-extrabold">
          {label && <span className="mr-2 align-middle text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>}
          ₹{eff.charge}{per && <span className="text-sm font-semibold">{per}</span>}
        </span>
      </p>
      {eff.struck > 0 && (
        <p className="mt-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
          {p.offerLabel || "offer price"}
        </p>
      )}
    </div>
  );
}
