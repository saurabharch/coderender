"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CONTACT, VERTICALS } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import { NAV_ICONS, VERTICAL_ICONS, SERVICE_ICONS, TOOL_ICONS, palette, orb } from "@/lib/nav-icons";
import { ThemeToggle } from "./theme-toggle";
import { MobileMenu, type MenuSection } from "./mobile-menu";
import { BrandLogo } from "./brand-theme";

interface SubItem {
  h: string;
  l: string;
  d: string;
  Icon: LucideIcon;
  color: string;
}

function buildMenus(): { label: string; href: string; icon: keyof typeof NAV_ICONS; items: SubItem[] }[] {
  return [
    {
      label: "Services", href: "/#services", icon: "services",
      items: SERVICES.map((s, i) => ({
        h: `/services/${s.slug}`, l: s.title, d: s.tagline,
        Icon: SERVICE_ICONS[s.slug], color: palette(i),
      })),
    },
    {
      label: "Industries", href: "/#verticals", icon: "industries",
      items: VERTICALS.map((v, i) => ({
        h: `/industries/${v.slug}`, l: v.label, d: v.blurb,
        Icon: VERTICAL_ICONS[v.slug], color: palette(i),
      })),
    },
    {
      label: "Resources", href: "/docs", icon: "about",
      items: [
        { h: "/docs", l: "Docs", d: "How everything here works.", Icon: NAV_ICONS.docs, color: palette(2) },
        { h: "/tools/gbp-booster-whatsapp-ai-agent", l: "GBP Booster", d: "WhatsApp AI agent for Google calls.", Icon: TOOL_ICONS["gbp-booster-whatsapp-ai-agent"], color: palette(0) },
        { h: "/tools/whatsapp-qr-generator", l: "QR Generator", d: "Click-to-chat links + QR codes.", Icon: TOOL_ICONS["whatsapp-qr-generator"], color: palette(4) },
        { h: "/tools/whatsapp-template-composer", l: "Template Composer", d: "Broadcast drafts with variables.", Icon: TOOL_ICONS["whatsapp-template-composer"], color: palette(5) },
        { h: "/tools/pricing-calculator", l: "Pricing Calculator", d: "Instant DRAFT estimates.", Icon: TOOL_ICONS["pricing-calculator"], color: palette(1) },
      ],
    },
    {
      label: "Partner", href: "/partner", icon: "partner",
      items: [
        { h: "/partner", l: "Become a Partner", d: "Earn with every business you send.", Icon: NAV_ICONS.partner, color: palette(3) },
        { h: "/pricing", l: "What you'll sell", d: "Ladder, catalog, DRAFT prices.", Icon: NAV_ICONS.pricing, color: palette(1) },
        { h: "/contact", l: "Talk to sales", d: "A human replies in one business day.", Icon: NAV_ICONS.contact, color: palette(5) },
      ],
    },
  ];
}

function NavIcon({ of, className }: { of: keyof typeof NAV_ICONS; className?: string }) {
  const I = NAV_ICONS[of];
  return <I size={16} className={className} />;
}

function OrbIcon({ xi, Icon }: { xi: number; Icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <span className="orb flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: orb(xi) }}>
      <Icon size={15} />
    </span>
  );
}

export function SiteHeader({ announcement }: { announcement?: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const menus = buildMenus();
  const sections: MenuSection[] = menus.map((m) => ({
    title: m.label,
    links: m.items.map((x, xi) => ({ h: x.h, l: x.l, icon: <OrbIcon xi={xi} Icon={x.Icon} /> })),
  }));
  sections.push({
    title: "Company",
    links: [
      { h: "/pricing", l: "Pricing", icon: <NavIcon of="pricing" /> },
      { h: "/about", l: "About", icon: <NavIcon of="about" /> },
      { h: "/contact", l: "Contact", icon: <NavIcon of="contact" /> },
    ],
  });
  return (
    <>
      <div className="overflow-hidden bg-brand-deep text-white">
        <a href={`tel:${CONTACT.phone}`} className="block px-4 py-3 text-center text-xs font-medium">
          <span className="marquee-auto items-center gap-8 whitespace-nowrap">
            {[false, true].map((hidden) => (
              <span key={String(hidden)} aria-hidden={hidden || undefined}>{announcement || `Boost sales and customer engagement with CodeRender! Call ${CONTACT.phone} or `}<span className="underline">Request a Call</span>&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            ))}
          </span>
        </a>
      </div>
      <header className={`sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur transition-shadow dark:border-white/10 dark:bg-black/80 ${scrolled ? "shadow-lg" : ""}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="coderender home"><BrandLogo wordmark="desktop" /></Link>
          <nav className="hidden items-center gap-0 text-[13px] md:flex lg:gap-1 lg:text-sm" aria-label="Primary">
            {menus.map((m) => (
              <div key={m.label} className="group relative">
                <Link href={m.href} aria-haspopup="true" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-1.5 hover:bg-black/5 dark:hover:bg-white/10 lg:gap-1.5 lg:px-2"><NavIcon of={m.icon} />{m.label} ▾</Link>
                <div className="invisible absolute left-0 top-full z-50 w-80 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-white/10 dark:bg-zinc-900">
                  {m.items.map((x, xi) => (
                    <Link key={x.h} href={x.h} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
                      <span className="orb flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: orb(xi) }}><x.Icon size={17} /></span>
                      <span><span className="block font-semibold">{x.l}</span><span className="block text-xs text-zinc-500">{x.d}</span></span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link href="/pricing" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-1.5 hover:bg-black/5 dark:hover:bg-white/10 lg:gap-1.5 lg:px-2"><NavIcon of="pricing" />Pricing</Link>
            <Link href="/contact" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-1.5 hover:bg-black/5 dark:hover:bg-white/10 lg:gap-1.5 lg:px-2"><NavIcon of="contact" />Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={CONTACT.whatsapp}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
            >
              Book Free Demo
            </a>
            <ThemeToggle />
            <MobileMenu sections={sections} />
          </div>
        </div>
      </header>
    </>
  );
}
