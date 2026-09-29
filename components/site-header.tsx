"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONTACT, VERTICALS } from "@/lib/site";
import { NAV_ICONS, VERTICAL_ICONS } from "@/lib/nav-icons";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { Logo } from "./logo";

function NavIcon({ of, className }: { of: keyof typeof NAV_ICONS; className?: string }) {
  const I = NAV_ICONS[of];
  return <I size={16} className={className} />;
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <div className="bg-brand-deep text-center text-xs text-white">
        <a href={`tel:${CONTACT.phone}`} className="block px-4 py-3 font-medium">
          Boost sales and customer engagement with CodeRender! Call {CONTACT.phone} or{" "}
          <span className="underline">Request a Call</span>
        </a>
      </div>
      <header className={`sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur transition-shadow dark:border-white/10 dark:bg-black/80 ${scrolled ? "shadow-lg" : ""}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="coderender home"><Logo /></Link>
          <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Primary">
            <Link href="/#services" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/10"><NavIcon of="services" />Services</Link>
            <div className="group relative">
              <Link href="/#verticals" aria-haspopup="true" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/10"><NavIcon of="industries" />Industries ▾</Link>
              <div className="invisible absolute left-0 top-full z-50 w-64 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-white/10 dark:bg-zinc-900">
                {VERTICALS.map((v) => {
                  const VI = VERTICAL_ICONS[v.slug];
                  return (
                    <Link key={v.slug} href={`/industries/${v.slug}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
                      {VI && <VI size={16} className="shrink-0 text-brand-deep" />}{v.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <Link href="/tools/gbp-booster-whatsapp-ai-agent" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/10"><NavIcon of="gbp" />GBP Booster</Link>
            <Link href="/pricing" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/10"><NavIcon of="pricing" />Pricing</Link>
            <Link href="/contact" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 hover:bg-black/5 dark:hover:bg-white/10"><NavIcon of="contact" />Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <MobileMenu links={[
              { h: "/#services", l: "Services", icon: <NavIcon of="services" /> },
              { h: "/#verticals", l: "Industries", icon: <NavIcon of="industries" /> },
              { h: "/tools/gbp-booster-whatsapp-ai-agent", l: "GBP Booster", icon: <NavIcon of="gbp" /> },
              { h: "/pricing", l: "Pricing", icon: <NavIcon of="pricing" /> },
              { h: "/about", l: "About", icon: <NavIcon of="about" /> },
              { h: "/contact", l: "Contact", icon: <NavIcon of="contact" /> },
            ]} />
            <a
              href={CONTACT.whatsapp}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
            >
              Book Free Demo
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
