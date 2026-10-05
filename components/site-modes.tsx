import Link from "next/link";
import { Phone } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { CONTACT, VERTICALS } from "@/lib/site";
import { getDb, getPref } from "@/lib/store";
import { listProducts } from "@/lib/commerce";
import { listServices } from "@/lib/catalog";
import { listSlides } from "@/lib/vyapar";
import { HeroSlider } from "@/components/hero-slider";
import { LeadForm } from "@/components/lead-form";

function biz(k: string, fb: string): string {
  return getPref(k, "") || fb;
}

// Business profile card: name, address, GSTIN/CIN, contact, enquiry form.
export function ProfileMode() {
  const theme = (() => { try { return getPref("site_theme", "minimal"); } catch { return "minimal"; } })();
  return (
    <section className="wrap section max-w-2xl text-center" data-profile-theme={theme}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Welcome</p>
      <h1 className="pf-name display-1 mt-2">{biz("biz_name", "Our Business")}</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        {[biz("biz_address", ""), biz("biz_city", ""), biz("biz_state", ""), biz("biz_pin", "")].filter(Boolean).join(", ")}
      </p>
      {(getPref("biz_gstin", "") || getPref("biz_cin", "")) && (
        <p className="mt-1 text-xs text-zinc-500">
          {[getPref("biz_gstin", "") && `GSTIN ${getPref("biz_gstin", "")}`, getPref("biz_cin", "") && `CIN ${getPref("biz_cin", "")}`].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a href={CONTACT.whatsapp} aria-label="Chat on WhatsApp" className="beam beam-rainbow btn-dark pf-call px-6 font-semibold">
          <BrandIcon name="whatsapp" size={18} /> WhatsApp us →
        </a>
        <a href={`tel:${biz("biz_phone", CONTACT.phone)}`} aria-label="Call us" className="btn-glass pf-call px-6 font-semibold">
          <Phone size={18} /> Call
        </a>
      </div>
      <LinkStrip />
      <div className="mt-8 text-left"><LeadForm /></div>
    </section>
  );
}

// Shop storefront: live catalogue grid + enquiry.
export function ShopMode() {
  let products: { id: number; name: string; price: number; mrp: number; shortDesc: string; images: string }[] = [];
  let slides: { id: number; image: string; title: string; subtitle: string; cta: string; href: string; anim: string }[] = [];
  try {
    products = listProducts({ status: "active", limit: 24 }) as typeof products;
    // Deep-plain: null-prototype sqlite rows crash client components.
    slides = JSON.parse(JSON.stringify(listSlides(true))) as typeof slides;
  } catch { /* first boot */ }
  const theme = siteTheme();
  return (
    <div className="sf-page" data-shop-theme={["amazon", "flipkart", "myntra", "ajio"].includes(theme) ? theme : "amazon"}>
      <div className="sf-head">
        <div className="wrap flex min-h-[56px] items-center justify-between gap-2 py-2">
          <p className="font-extrabold tracking-tight">{biz("biz_name", "Our Shop")}</p>
          <Link href="/checkout" className="sf-cta inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-bold">Cart / Checkout →</Link>
        </div>
      </div>
      <section className="wrap section">
      <HeroSlider slides={slides} />
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Shop</p>
      <h1 className="display-1 mt-2">Today&apos;s picks</h1>
      {products.length === 0 ? (
        <p className="mt-4 text-zinc-500">Catalogue coming soon — <Link href="/contact" className="underline">ask us on WhatsApp</Link>.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {products.map((p) => {
            const img = (JSON.parse(p.images || "[]") as string[])[0];
            return (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name} loading="lazy" className="aspect-square w-full object-cover" />
                ) : <div aria-hidden className="aspect-square w-full bg-black/5 dark:bg-white/10" />}
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-sm">₹{(p.price / 100).toFixed(0)}
                    {p.mrp > p.price && <span className="ml-1 text-xs text-zinc-500 line-through">₹{(p.mrp / 100).toFixed(0)}</span>}</p>
                  {p.shortDesc && <p className="mt-0.5 truncate text-xs text-zinc-500">{p.shortDesc}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={CONTACT.whatsapp} className="sf-cta inline-flex min-h-[44px] items-center rounded-full px-6 font-bold">Order on WhatsApp →</a>
        <Link href="/checkout" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 font-semibold dark:border-white/20">Checkout →</Link>
      </div>
      <LinkStrip />
    </section>
    </div>
  );
}

// Booking app: services + verticals + booking form.
export function BookingMode() {
  const services = listServices().slice(0, 8) as { slug: string; title: string }[];
  const theme = siteTheme();
  const bk = ["cal", "district", "bms"].includes(theme) ? theme : "cal";
  return (
    <div className="bk-page" data-booking-theme={bk}>
    <section className="wrap section">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Book a service</p>
      <h1 className="display-1 mt-2">{biz("biz_name", "Book with us")}</h1>
      <ul className="mt-6 grid gap-2 md:grid-cols-2">
        {services.map((s) => (
          <li key={s.slug}>
            <Link href={`/services/${s.slug}`} className="flex min-h-[44px] items-center justify-between rounded-2xl border border-black/10 px-4 py-3 font-semibold dark:border-white/10">
              {s.title}<span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm font-bold">Industries we serve</p>
      <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
        {VERTICALS.map((v) => (
          <li key={v.slug}><Link href={`/industries/${v.slug}`} className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-4 dark:border-white/20">{v.label}</Link></li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={CONTACT.whatsapp} className="bk-accent inline-flex min-h-[44px] items-center rounded-full px-6 font-bold">Book on WhatsApp →</a>
      </div>
      <div className="mt-8"><LeadForm /></div>
      <LinkStrip />
    </section>
    </div>
  );
}

export function siteMode(): string {
  try {
    const m = getDb().prepare("SELECT value FROM Preference WHERE key='site_mode'").get() as { value: string } | undefined;
    return ["agency", "profile", "shop", "booking"].includes(m?.value ?? "") ? m!.value : "agency";
  } catch {
    return "agency";
  }
}

export function siteTheme(): string {
  try {
    const m = getPref("site_theme", "amazon");
    return ["amazon", "flipkart", "myntra", "ajio", "cal", "district", "bms", "minimal", "bold"].includes(m) ? m : "amazon";
  } catch {
    return "amazon";
  }
}

export function siteLinks(): { label: string; href: string }[] {
  try {
    const raw = getPref("site_links", "");
    return raw.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((l) => {
      const [label, href] = l.split("|").map((s) => s.trim());
      return { label: label || href || "", href: href || label || "/" };
    }).filter((l) => l.label);
  } catch {
    return [];
  }
}

export function LinkStrip() {
  const links = siteLinks();
  if (!links.length) return null;
  return (
    <nav aria-label="Quick links" className="mt-4 flex flex-wrap justify-center gap-1.5 text-sm">
      {links.map((l) => (
        <Link key={l.label} href={l.href} className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-4 dark:border-white/20">{l.label}</Link>
      ))}
    </nav>
  );
}
