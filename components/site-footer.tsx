import Link from "next/link";
import { Phone, Mail, MessageCircle, QrCode, Type, Calculator } from "lucide-react";
import { CONTACT, VERTICALS } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Marketing that delivers revenue. No stress, no guesswork, just growth.
          </p>
          <p className="mt-3 space-y-1.5">
            <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-2"><Phone size={15} />{CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2"><Mail size={15} />{CONTACT.email}</a>
          </p>
        </div>
        <nav aria-label="Industries">
          <p className="font-semibold">Coderender For</p>
          <ul className="mt-2 space-y-1">
            {VERTICALS.map((v) => (
              <li key={v.slug}>
                <Link href={`/industries/${v.slug}`}>{v.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Featured tool">
          <p className="font-semibold">Featured Tool</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link href="/tools/gbp-booster-whatsapp-ai-agent" className="flex items-center gap-2"><MessageCircle size={15} />GBP Booster — WhatsApp AI Agent</Link>
            </li>
            <li>
              <Link href="/tools/whatsapp-qr-generator" className="flex items-center gap-2"><QrCode size={15} />WhatsApp QR Generator</Link>
            </li>
            <li>
              <Link href="/tools/whatsapp-template-composer" className="flex items-center gap-2"><Type size={15} />Template Composer</Link>
            </li>
            <li>
              <Link href="/tools/pricing-calculator" className="flex items-center gap-2"><Calculator size={15} />Pricing Calculator</Link>
            </li>
          </ul>
          <p className="mt-4 font-semibold">Company</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/about">About us</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/contact">Contact us</Link></li>
            <li><Link href="/partner">Become a Partner</Link></li>
            <li><Link href="/docs">Docs</Link></li>
          </ul>
        </nav>
        <div>
          <p className="font-semibold">Contact</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{CONTACT.address}</p>
          <p className="mt-3 space-x-3 text-xs">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund">Refunds</Link>
          </p>
          <p className="mt-2 text-xs text-zinc-500">© 2026 Coderender. Prices marked DRAFT until verified.</p>
        </div>
      </div>
    </footer>
  );
}
