import Link from "next/link";
import { Phone, Mail, MessageCircle, QrCode, Type, Calculator, MapPin, Info, Briefcase, Handshake, BookOpen, Tag, HelpCircle, MessageSquare, ShieldCheck, FileText, RotateCcw, type LucideIcon } from "lucide-react";
import { CONTACT } from "@/lib/site";
import pkg from "@/package.json";
import { Logo } from "./logo";

const APP_VERSION = pkg.version;

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden>
      <span className="absolute h-full w-full animate-ping rounded-full bg-brand opacity-75" />
      <span className="h-2 w-2 rounded-full bg-brand-deep" />
    </span>
  );
}

const COLS: { title: string; links: { h: string; l: string; Icon: LucideIcon }[] }[] = [
  {
    title: "Features",
    links: [
      { h: "/about", l: "About Us", Icon: Info },
      { h: "/contact", l: "Contact Us", Icon: Mail },
      { h: "/careers", l: "Careers", Icon: Briefcase },
      { h: "/partner", l: "Partner With Us", Icon: Handshake },
    ],
  },
  {
    title: "Free Tools",
    links: [
      { h: "/tools/gbp-booster-whatsapp-ai-agent", l: "GBP Booster AI Agent", Icon: MessageCircle },
      { h: "/tools/pricing-calculator", l: "Pricing Calculator", Icon: Calculator },
      { h: "/tools/whatsapp-qr-generator", l: "WhatsApp QR Generator", Icon: QrCode },
      { h: "/tools/whatsapp-template-composer", l: "Template Composer", Icon: Type },
    ],
  },
  {
    title: "Support",
    links: [
      { h: "/#faq", l: "FAQ's", Icon: HelpCircle },
      { h: "/contact", l: "Raise A Ticket", Icon: MessageSquare },
      { h: "/docs", l: "Docs", Icon: BookOpen },
      { h: "/pricing", l: "Pricing", Icon: Tag },
    ],
  },
  {
    title: "Quick Links",
    links: [
      { h: "/privacy", l: "Privacy Policy", Icon: ShieldCheck },
      { h: "/terms", l: "Terms & Conditions", Icon: FileText },
      { h: "/refund", l: "Refund Policy", Icon: RotateCcw },
      { h: "/tools/whatsapp-qr-generator", l: "QR Generator", Icon: QrCode },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950">
      <span aria-hidden className="pointer-events-none absolute -right-4 bottom-0 hidden select-none text-[110px] font-extrabold leading-none tracking-tighter text-black/[0.05] dark:text-white/[0.07] [writing-mode:vertical-rl] md:block">coderender</span>
      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Transform your business with seamless multi-channel automation solutions.
            </p>
            <div className="mt-3 flex gap-2">
              <a href={CONTACT.whatsapp} aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 dark:border-white/15"><MessageCircle size={18} /></a>
              <a href={`tel:${CONTACT.phone}`} aria-label="Call" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 dark:border-white/15"><Phone size={18} /></a>
              <a href={`mailto:${CONTACT.email}`} aria-label="Email" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 dark:border-white/15"><Mail size={18} /></a>
              <a href="/contact" aria-label="Visit" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 dark:border-white/15"><MapPin size={18} /></a>
            </div>
            <p className="mt-4 space-y-1.5 text-sm">
              <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2"><Phone size={15} />{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2"><Mail size={15} />{CONTACT.email}</a>
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"><MapPin size={15} className="mt-0.5 shrink-0" />{CONTACT.address}</p>
          </div>
          <nav aria-label="Footer columns" className="hidden gap-8 sm:grid sm:grid-cols-2 md:hidden lg:grid lg:grid-cols-2">
            {COLS.map((c) => (
              <div key={c.title}>
                <p className="flex items-center gap-2 font-semibold"><PulseDot />{c.title}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {c.links.map((x) => (
                    <li key={x.h + x.l}><Link href={x.h} className="flex items-center gap-2"><x.Icon size={15} className="shrink-0 text-zinc-500" />{x.l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="hidden md:block lg:hidden">
            <p className="flex items-center gap-2 font-semibold"><PulseDot />Explore</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {COLS.flatMap((c) => c.links).slice(0, 8).map((x) => (
                <li key={x.h + x.l}><Link href={x.h} className="flex items-center gap-2"><x.Icon size={15} className="shrink-0 text-zinc-500" />{x.l}</Link></li>
              ))}
            </ul>
          </div>
          <div className="sm:hidden">
            {COLS.map((c) => (
              <details key={c.title} className="border-b border-black/10 py-1 dark:border-white/10">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><PulseDot />{c.title}</span>
                </summary>
                <ul className="space-y-1.5 pb-3 text-sm">
                  {c.links.map((x) => (
                    <li key={x.h + x.l}><Link href={x.h} className="flex items-center gap-2"><x.Icon size={15} className="shrink-0 text-zinc-500" />{x.l}</Link></li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <div className="text-sm">
            <p className="font-semibold">Contact</p>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">For Sales & Support: <a href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a></p>
            <p className="mt-4 font-semibold">Popular tools</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/tools/whatsapp-qr-generator" className="flex items-center gap-2"><QrCode size={15} />QR Generator</Link></li>
              <li><Link href="/tools/whatsapp-template-composer" className="flex items-center gap-2"><Type size={15} />Template Composer</Link></li>
              <li><Link href="/tools/pricing-calculator" className="flex items-center gap-2"><Calculator size={15} />Pricing Calculator</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-black/10 pt-4 text-xs text-zinc-500 md:flex-row dark:border-white/10">
          <p>© {new Date().getFullYear()} Coderender · v{APP_VERSION}. All rights reserved.</p>
          <p className="space-x-3">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms & Conditions</Link>
            <Link href="/refund">Refund Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
