"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONTACT, VERTICALS } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "./logo";

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
          <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Primary">
            <Link href="/#services">Services</Link>
            <div className="group relative">
              <Link href="/#verticals" aria-haspopup="true" className="inline-flex min-h-[44px] items-center">Industries ▾</Link>
              <div className="invisible absolute left-0 top-full z-50 w-64 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-white/10 dark:bg-zinc-900">
                {VERTICALS.map((v) => (
                  <Link key={v.slug} href={`/industries/${v.slug}`} className="block rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">{v.label}</Link>
                ))}
              </div>
            </div>
            <Link href="/tools/gbp-booster-whatsapp-ai-agent">GBP Booster</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <details className="relative md:hidden">
              <summary aria-label="Open menu" className="flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center justify-center rounded-xl border border-black/10 dark:border-white/15 [&::-webkit-details-marker]:hidden">
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900">
                {[{ h: "/#services", l: "Services" }, { h: "/#verticals", l: "Industries" }, { h: "/tools/gbp-booster-whatsapp-ai-agent", l: "GBP Booster" }, { h: "/pricing", l: "Pricing" }, { h: "/about", l: "About" }, { h: "/contact", l: "Contact" }].map((x) => (
                  <a key={x.h + x.l} href={x.h} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-black/5 dark:hover:bg-white/10">{x.l}</a>
                ))}
              </div>
            </details>
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
