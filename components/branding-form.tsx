"use client";

import { useEffect, useState } from "react";
import { ImageInputField } from "@/components/media-picker";
import { FONT_STACKS, STANDARD_PALETTES, BRAND_SCOPES } from "@/lib/brand";

export type BrandVals = Record<string, string>;

function Slot({ name, label, hint, value, onChange }: {
  name: string; label: string; hint: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="grid min-w-0 flex-1 gap-1 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10">
      <span className="font-bold">{label} <span className="block text-xs font-normal text-zinc-500">{hint}</span></span>
      <input type="hidden" name={name} value={value} />
      <ImageInputField value={value} onChange={onChange} folder="branding" />
    </label>
  );
}

// Branding & Theme tab body: uploads, opacity (AlphaSlider pattern), palette
// (swatches + custom picker), fonts, scope — with a live preview. Submits
// through the parent server form (all inputs carry names).
export function BrandingFields({ initial }: { initial: BrandVals }) {
  const [v, setV] = useState<BrandVals>(initial);
  // After save+redirect the server sends fresh values but React keeps editor
  // state — resync so the preview shows what is actually saved.
  const fingerprint = JSON.stringify(initial);
  useEffect(() => {
    setV(JSON.parse(fingerprint) as BrandVals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  const opacity = Math.min(100, Math.max(10, Number(v.brand_logo_opacity) || 100));
  const font = FONT_STACKS.find((f) => f.id === v.brand_font) ?? FONT_STACKS[0];
  const logoLight = v.brand_logo_light || "";
  const logoDark = v.brand_logo_dark || logoLight;

  return (
    <div className="grid gap-3">
      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">Site identity <span className="text-xs font-normal text-zinc-500">(title, tagline, SEO)</span></p>
        <div className="mt-2 grid gap-2">
          <label className="grid gap-1 text-sm">Site name
            <input name="site_name" value={v.site_name ?? ""} maxLength={120}
              onChange={(e) => set("site_name", e.target.value)} placeholder="CodeRender"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
          <label className="grid gap-1 text-sm">Tagline
            <input name="site_tagline" value={v.site_tagline ?? ""} maxLength={200}
              onChange={(e) => set("site_tagline", e.target.value)} placeholder="WhatsApp Automation, Google Business Profile & Local SEO"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
          <label className="grid gap-1 text-sm">Meta description
            <textarea name="site_description" value={v.site_description ?? ""} maxLength={500} rows={3}
              onChange={(e) => set("site_description", e.target.value)} placeholder="One or two sentences for search results."
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
          </label>
          <label className="grid gap-1 text-sm">Meta keywords <span className="text-xs font-normal text-zinc-500">(comma-separated)</span>
            <input name="site_keywords" value={v.site_keywords ?? ""} maxLength={1000}
              onChange={(e) => set("site_keywords", e.target.value)} placeholder="whatsapp automation, local seo india, …"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
        </div>
      </section>
      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">Logos <span className="text-xs font-normal text-zinc-500">(PNG with transparency works best)</span></p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Slot name="brand_logo_light" label="Logo · light theme" hint="Header/footer on light" value={logoLight} onChange={(x) => set("brand_logo_light", x)} />
          <Slot name="brand_logo_dark" label="Logo · dark theme" hint="Falls back to light logo" value={v.brand_logo_dark} onChange={(x) => set("brand_logo_dark", x)} />
          <Slot name="brand_stamp_light" label="Stamp · light" hint="Small badge / watermark" value={v.brand_stamp_light} onChange={(x) => set("brand_stamp_light", x)} />
          <Slot name="brand_stamp_dark" label="Stamp · dark" hint="Small badge / watermark" value={v.brand_stamp_dark} onChange={(x) => set("brand_stamp_dark", x)} />
        </div>
        <label className="mt-2 grid gap-1 text-sm">
          <span className="flex items-center justify-between font-bold">Logo opacity <span className="font-mono">{opacity}%</span></span>
          <input type="range" name="brand_logo_opacity_range" min={10} max={100} value={opacity}
            onChange={(e) => set("brand_logo_opacity", e.target.value)}
            aria-label="Logo opacity" className="min-h-[44px] w-full accent-teal-700" />
          <input type="hidden" name="brand_logo_opacity" value={String(opacity)} />
        </label>
      </section>

      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">Banners <span className="text-xs font-normal text-zinc-500">(wide hero strips)</span></p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Slot name="brand_banner_light" label="Banner · light" hint="1920px wide ideal" value={v.brand_banner_light} onChange={(x) => set("brand_banner_light", x)} />
          <Slot name="brand_banner_dark" label="Banner · dark" hint="1920px wide ideal" value={v.brand_banner_dark} onChange={(x) => set("brand_banner_dark", x)} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">Favicon & loading <span className="text-xs font-normal text-zinc-500">(tab icon + splash; empty = default mark)</span></p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Slot name="brand_favicon" label="Favicon" hint="PNG 32×32 or SVG" value={v.brand_favicon} onChange={(x) => set("brand_favicon", x)} />
          <Slot name="brand_loading_icon" label="Loading icon" hint="Splash over preloader" value={v.brand_loading_icon} onChange={(x) => set("brand_loading_icon", x)} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">App icons <span className="text-xs font-normal text-zinc-500">(PWA — upload exact sizes)</span></p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Slot name="brand_pwa_192" label="Icon 192px" hint="PNG 192×192" value={v.brand_pwa_192} onChange={(x) => set("brand_pwa_192", x)} />
          <Slot name="brand_pwa_512" label="Icon 512px" hint="PNG 512×512" value={v.brand_pwa_512} onChange={(x) => set("brand_pwa_512", x)} />
          <Slot name="brand_pwa_maskable" label="Maskable" hint="PNG 512×512, padded" value={v.brand_pwa_maskable} onChange={(x) => set("brand_pwa_maskable", x)} />
          <Slot name="brand_pwa_apple" label="Apple touch" hint="PNG 180×180" value={v.brand_pwa_apple} onChange={(x) => set("brand_pwa_apple", x)} />
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="font-bold">Palette & type</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Standard palettes">
          {STANDARD_PALETTES.map((p) => (
            <button key={p.name} type="button" onClick={() => {
              set("brand_primary", p.primary);
              if (p.deep) set("brand_deep", p.deep);
              if (p.accent) set("brand_accent", p.accent);
              if (p.ink) set("brand_ink", p.ink);
            }}
              title={`${p.name} — primary ${p.primary}`} aria-label={`${p.name} palette`} aria-pressed={v.brand_primary === p.primary}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${v.brand_primary === p.primary ? "border-black dark:border-white" : "border-transparent"}`}
              style={{ background: p.primary }}>
              {v.brand_primary === p.primary ? <span aria-hidden className="text-xs font-bold text-white">✓</span> : null}
            </button>
          ))}
          <label className="flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-dashed border-black/30 px-2 text-xs font-bold dark:border-white/30" title="Custom color">
            Custom
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(v.brand_primary) ? v.brand_primary : "#0d9488"}
              onChange={(e) => set("brand_primary", e.target.value)} aria-label="Custom primary color" className="sr-only" />
          </label>
          <input type="hidden" name="brand_primary" value={v.brand_primary} />
          <span className="font-mono text-xs text-zinc-500">{v.brand_primary}</span>
        </div>
        <div className="mt-2 grid gap-1.5">
          {([
            ["brand_deep", "Deep teal", v.brand_deep || "#064E46"],
            ["brand_accent", "Accent lime", v.brand_accent || "#D7F45A"],
            ["brand_ink", "Text ink", v.brand_ink || "#171717"],
          ] as const).map(([key, label, val]) => (
            <label key={key} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 text-sm dark:border-white/10">
              <span className="h-6 w-6 shrink-0 rounded-full border border-black/20" style={{ background: val }} aria-hidden />
              <span className="font-semibold">{label}</span>
              <span className="font-mono text-xs text-zinc-500">{val}</span>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(val) ? val : "#0F8F83"}
                onChange={(e) => set(key, e.target.value)} aria-label={`Custom ${label.toLowerCase()} color`}
                className="ml-auto h-9 w-14 cursor-pointer rounded-lg border border-black/15 bg-transparent dark:border-white/20" />
              <input type="hidden" name={key} value={val} />
            </label>
          ))}
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="flex gap-1" aria-hidden>
              <span className="h-5 w-5 rounded-full bg-black" /><span className="h-5 w-5 rounded-full border border-black/20 bg-white" />
            </span>
            Pure black / white stay locked — dark mode depends on them.
          </p>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Headings & text
            <select name="brand_font" value={v.brand_font} onChange={(e) => set("brand_font", e.target.value)}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
              {FONT_STACKS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <fieldset className="grid gap-1 text-sm">Applies to
            <span className="flex flex-wrap gap-1.5">
              {BRAND_SCOPES.map((s) => (
                <label key={s} className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-black/15 px-3 capitalize dark:border-white/20">
                  <input type="radio" name="brand_scope" value={s} checked={v.brand_scope === s} onChange={() => set("brand_scope", s)} className="h-5 w-5" />
                  {s}
                </label>
              ))}
            </span>
          </fieldset>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10" aria-label="Theme preview">
        <p className="font-bold">Preview</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[["light", "#fff", "#111", logoLight], ["dark", "#111", "#eee", logoDark]].map(([mode, bg, fg, logo]) => (
            <div key={mode} className="rounded-xl p-3" style={{ background: bg, color: fg }}>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">{mode}</p>
              {logo
                ? <img src={logo} alt={`${mode} logo preview`} style={{ opacity: opacity / 100 }} className="mt-1 h-10 w-auto" />
                : <p className="mt-1 text-sm font-extrabold" style={{ fontFamily: font.display }}>coderender</p>}
              <p className="mt-1 text-lg font-extrabold tracking-tight" style={{ fontFamily: font.display }}>Grow on autopilot</p>
              <p className="text-xs opacity-70" style={{ fontFamily: font.body }}>Reviews, replies and posts — handled daily.</p>
              <p className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: v.brand_primary }}>Get started</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
