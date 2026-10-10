"use client";

import { useEffect, useState } from "react";
import { Badge, SegmentedControl, Text } from "@mantine/core";
import { planEffective } from "@/lib/catalog-core";
import { NoSsr } from "@/components/no-ssr";

export interface OfferInitial {
  price: number; priceLabel: string; mrp: number; offerMode: string;
  offerValue: number; offerLabel: string; badge: string;
}

// Offer block for plan create/update forms (server actions submit the
// named native fields; Mantine owns the mode toggle + live preview).
// The preview mirrors the sibling price input by id, so it stays honest
// as the price is typed. NoSsr: first paint renders the native fallback
// so the form always submits, even before hydration.
export function PlanOfferFields({ initial, priceInputId }: { initial?: Partial<OfferInitial>; priceInputId?: string }) {
  return (
    <NoSsr fallback={<OfferNative initial={initial} />}>
      <OfferLive initial={initial} priceInputId={priceInputId} />
    </NoSsr>
  );
}

function num(v: string, fb: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : fb;
}

function OfferNative({ initial }: { initial?: Partial<OfferInitial> }) {
  const i = { price: 0, priceLabel: "price", mrp: 0, offerMode: "off", offerValue: 0, offerLabel: "offer price", badge: "none", ...initial };
  const inp = "min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";
  return (
    <div className="grid gap-2 rounded-2xl border border-dashed border-black/15 p-3 dark:border-white/20">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <label className="grid gap-0.5 text-xs">Price label
          <input name="priceLabel" defaultValue={i.priceLabel} maxLength={30} placeholder="price / actual price / total price" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Compare-at MRP (₹, 0 = none)
          <input name="mrp" inputMode="numeric" defaultValue={i.mrp || ""} placeholder="0" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Offer label
          <input name="offerLabel" defaultValue={i.offerLabel} maxLength={30} placeholder="offer price / discount price" className={inp} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <label className="grid gap-0.5 text-xs">Offer mode
          <select name="offerMode" defaultValue={i.offerMode} className={inp}>
            <option value="off">off</option>
            <option value="flat">flat ₹ off</option>
            <option value="pct">% off</option>
          </select></label>
        <label className="grid gap-0.5 text-xs">Offer value
          <input name="offerValue" inputMode="numeric" defaultValue={i.offerValue || ""} placeholder="0" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Badge
          <select name="badge" defaultValue={i.badge} className={inp}>
            <option value="none">none</option>
            <option value="new">new</option>
            <option value="offer">offer price</option>
            <option value="new-price">new price</option>
          </select></label>
      </div>
    </div>
  );
}

function OfferLive({ initial, priceInputId }: { initial?: Partial<OfferInitial>; priceInputId?: string }) {
  const i = { price: 0, priceLabel: "price", mrp: 0, offerMode: "off", offerValue: 0, offerLabel: "offer price", badge: "none", ...initial };
  const [priceLabel, setPriceLabel] = useState(i.priceLabel);
  const [mrp, setMrp] = useState(String(i.mrp || ""));
  const [mode, setMode] = useState(i.offerMode === "flat" || i.offerMode === "pct" ? i.offerMode : "off");
  const [value, setValue] = useState(String(i.offerValue || ""));
  const [offerLabel, setOfferLabel] = useState(i.offerLabel);
  const [badge, setBadge] = useState(i.badge);
  const [price, setPrice] = useState(String(i.price || ""));
  useEffect(() => {
    if (!priceInputId) return;
    const el = document.getElementById(priceInputId) as HTMLInputElement | null;
    if (!el) return;
    const sync = () => setPrice(el.value);
    sync();
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [priceInputId]);
  const eff = planEffective({ price: num(price, i.price), mrp: num(mrp, 0), offerMode: mode, offerValue: num(value, 0) });
  const inp = "min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";
  return (
    <div className="grid gap-2 rounded-2xl border border-dashed border-black/15 p-3 dark:border-white/20">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <label className="grid gap-0.5 text-xs">Price label
          <input name="priceLabel" value={priceLabel} maxLength={30} onChange={(e) => setPriceLabel(e.target.value)}
            placeholder="price / actual price / total price" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Compare-at MRP (₹, blank = none)
          <input name="mrp" inputMode="numeric" value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="0" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Offer label
          <input name="offerLabel" value={offerLabel} maxLength={30} onChange={(e) => setOfferLabel(e.target.value)}
            placeholder="offer price / discount price" className={inp} /></label>
      </div>
      <div>
        <Text size="xs" fw={600} mb={4}>Offer</Text>
        <SegmentedControl
          fullWidth
          value={mode}
          onChange={(v) => setMode(v)}
          data={[
            { label: "Off", value: "off" },
            { label: "Flat ₹", value: "flat" },
            { label: "%", value: "pct" },
          ]}
        />
        <input type="hidden" name="offerMode" value={mode} />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <label className="grid gap-0.5 text-xs">Offer value
          <input name="offerValue" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className={inp} /></label>
        <label className="grid gap-0.5 text-xs">Badge
          <select name="badge" value={badge} onChange={(e) => setBadge(e.target.value)} className={inp}>
            <option value="none">none</option>
            <option value="new">new</option>
            <option value="offer">offer price</option>
            <option value="new-price">new price</option>
          </select></label>
        <div className="flex items-end gap-2 pb-1" aria-live="polite">
          {eff.struck > 0 && <s className="text-xs text-zinc-400">₹{eff.struck}</s>}
          <b className="text-sm">₹{eff.charge}</b>
          {eff.pctOff > 0 && (
            <Badge color="teal" variant="light" size="sm">−{eff.pctOff}%</Badge>
          )}
          {badge !== "none" && (
            <Badge color={badge === "new" ? "blue" : "teal"} variant="filled" size="sm">
              {badge === "new-price" ? "new price" : badge === "offer" ? "offer price" : "new"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
