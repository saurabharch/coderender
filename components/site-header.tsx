import Link from "next/link";
import { CONTACT } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <>
      <div className="bg-brand-deep text-center text-xs text-white">
        <a href={`tel:${CONTACT.phone}`} className="block px-4 py-3 font-medium">
          Boost sales and customer engagement with CodeRender! Call {CONTACT.phone} or{" "}
          <span className="underline">Request a Call</span>
        </a>
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            coderender
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex" aria-label="Primary">
            <Link href="/#services">Services</Link>
            <Link href="/#verticals">Industries</Link>
            <Link href="/tools/gbp-booster-whatsapp-ai-agent">GBP Booster</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
