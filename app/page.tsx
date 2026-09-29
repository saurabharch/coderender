import Link from "next/link";
import { CONTACT, VERTICALS } from "@/lib/site";
import { StackedServices } from "@/components/stacked-services";
import { CampaignCalendar } from "@/components/campaign-calendar";
import { VERTICAL_ICONS, orb } from "@/lib/nav-icons";
import { INTEGRATIONS } from "@/lib/integrations";
import { LeadForm } from "@/components/lead-form";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { IPhoneMock } from "@/components/iphone-mock";
import { Star } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";

const CHANNELS = [
  { icon: "whatsapp", label: "WhatsApp" },
  { icon: "facebook", label: "Facebook" },
  { icon: "instagram", label: "Instagram" },
  { icon: "messenger", label: "Messenger" },
  { icon: "telegram", label: "Telegram" },
];
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "What does CodeRender do?", a: "We run your local growth: Google profile, posts, reviews, WhatsApp replies, ads, and a fast website — so enquiries arrive while you focus on customers." },
  { q: "How fast will I see enquiries?", a: "Most businesses see more calls and messages within 2–4 weeks once the profile tune-up and reply flows go live." },
  { q: "Do I need to be tech-savvy?", a: "No. If you can use WhatsApp, you can work with us. We handle setup and send you a simple weekly summary." },
  { q: "Is my customer data safe?", a: "Yes. We use least-access credentials, never store secrets in files, and work on client-owned accounts by default." },
  { q: "What does it cost?", a: "Start with a fixed-price GBP audit (DRAFT ₹2,999), then a per-vertical growth pack or a capped monthly retainer. All prices stay DRAFT until verified with you." },
  { q: "Is there a free trial?", a: "Yes — start with the fixed-price audit, credited toward your growth pack if you continue. No lock-in." },
  { q: "How fast do we go live?", a: "Reply flows and profile tune-up in week 1–2; the full weekly rhythm from week 2. Retainer momentum compounds from month 2–3." },
  { q: "Does it connect to my CRM?", a: "Yes — Sheets out of the box, Zoho/HubSpot-style CRMs on project plans: contacts sync, event-triggered messages, delivery stats logged back." },
];

export default function Home() {
  return (
    <>
      <section className="hero-glow">
        <div className="wrap pb-10 pt-14 text-center md:pt-20">
          <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-deep dark:border-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> Powered by the official WhatsApp Business API
          </p>
          <h1 className="display-1 mx-auto mt-4 max-w-3xl text-balance">
            Your all-in-one growth team that delivers real revenue
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
            Google profile, WhatsApp replies, reviews, posts, and ads — handled daily so you can focus on your craft.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={CONTACT.whatsapp} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 font-semibold text-white dark:bg-white dark:text-zinc-900">Free GBP Booster →</a>
            <a href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 font-semibold dark:border-white/20">Book Free Demo</a>
          </div>
          <ul aria-label="Channels we automate" className="mt-6 flex flex-wrap justify-center gap-2">
            {CHANNELS.map(({ icon, label }) => (
              <li key={label} title={label} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white dark:border-white/15 dark:bg-black">
                <BrandIcon name={icon} size={20} />
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center"><IPhoneMock /></div>
          <dl className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-2 text-center">
            {[{ v: <CountUp to={10} />, l: "local verticals" }, { v: <CountUp to={6} />, l: "core services" }, { v: <>24/7</>, l: "reply coverage" }].map(({ v, l }) => (
              <div key={l} className="rounded-2xl border border-black/10 px-2 py-3 dark:border-white/10">
                <dt className="sr-only">{l}</dt>
                <dd className="text-2xl font-extrabold tracking-tight">{v}</dd>
                <dd className="text-xs text-zinc-600 dark:text-zinc-400">{l}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Trusted by owners in 10 local verticals · Salons · Clinics · Gyms · Restaurants · and more
          </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Capabilities gallery">
        <div className="wrap section !pb-0 !pt-12">
          <div className="marquee pb-2">
            <div className="marquee-auto">
            {[
              ["AI replies", "Every question answered in your tone", "from-brand/50 to-brand-soft"],
              ["AI training", "Flows retrained on your real chats", "from-amber-200 to-amber-50 dark:from-amber-900 dark:to-black"],
              ["Multichannel", "WhatsApp, Instagram, Messenger, calls", "from-sky-200 to-sky-50 dark:from-sky-900 dark:to-black"],
              ["Growth loop", "Reviews and broadcasts compound weekly", "from-emerald-200 to-emerald-50 dark:from-emerald-900 dark:to-black"],
              ["AI replies", "Every question answered in your tone", "from-brand/50 to-brand-soft"],
              ["AI training", "Flows retrained on your real chats", "from-amber-200 to-amber-50 dark:from-amber-900 dark:to-black"],
              ["Multichannel", "WhatsApp, Instagram, Messenger, calls", "from-sky-200 to-sky-50 dark:from-sky-900 dark:to-black"],
              ["Growth loop", "Reviews and broadcasts compound weekly", "from-emerald-200 to-emerald-50 dark:from-emerald-900 dark:to-black"],
            ].map(([t, d, g], i) => (
              <figure key={`${t}-${i}`} className="w-64 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                <div aria-hidden className={`h-28 bg-gradient-to-br ${g}`} />
                <figcaption className="p-4">
                  <p className="font-bold">{t}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{d}</p>
                </figcaption>
              </figure>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Agents" className="border-y border-black/10 bg-white py-0 dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="beam glass rounded-2xl p-8 md:col-span-2 md:row-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Lead agent</p>
              <p className="mt-4 max-w-[18ch] text-4xl font-extrabold leading-none tracking-tight md:text-5xl">
                More calls from Google, every week.
              </p>
              <p className="mt-6 max-w-[44ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Keywords, SEO posts, and review replies tuned for Maps + Search — the profile becomes your hardest-working salesperson.
              </p>
            </div>
            <div className="glass rounded-2xl p-6 dark:border-white/10 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Chat agent</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">24/7</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Every WhatsApp + DM answered in seconds, in your tone.</p>
            </div>
            <div className="glass rounded-2xl p-6 dark:border-white/10 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Marketing agent</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">Repeat</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Offers and reminders sent to the right past customers.</p>
            </div>
            <div className="glass rounded-2xl p-6 dark:border-white/10 dark:bg-black md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Shared brain</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">Leads, sales, and chats in one place for all agents.</p>
            </div>
          </div>
          </Reveal>
        </div>
      </section>

      <section aria-label="Platforms">
        <div className="wrap section !py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Built on official platforms</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {["WhatsApp Business API", "Google Business Profile", "Meta", "Google Maps", "Instagram"].map((p) => (
              <li key={p} className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Integrations">
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Integrations</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Plays well with your stack</h2>
          <div className="marquee mt-6 pb-2">
            <div className="marquee-auto">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((g, i) => (
              <div key={`${g.name}-${i}`} className="flex w-56 items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-white/10"><BrandIcon name={g.icon} size={22} /></span>
                <div>
                  <p className="text-sm font-bold">{g.name}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{g.blurb}</p>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section id="verticals">
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Industries</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Built for businesses like yours</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERTICALS.map((v, i) => {
            const VI = VERTICAL_ICONS[v.slug];
            return (
              <Link key={v.slug} href={`/industries/${v.slug}`} className="group beam glass rounded-2xl p-5 transition hover:-translate-y-1">
                <span className="orb flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: orb(i) }}>
                  {VI && <VI size={24} />}
                </span>
                <p className="mt-3 font-bold">{v.label} <span aria-hidden className="inline-block transition group-hover:translate-x-1">→</span></p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{v.blurb}</p>
              </Link>
            );
          })}
        </div>
        </div>
      </section>

      <section id="services" className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Our services</p>
          <h2 className="display-2 mt-2">Digital services we offer</h2>
          <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">Six fixed-scope services that cover the whole local funnel. Pick one to see its briefing.</p>
          <div className="mt-6"><StackedServices /></div>
        </div>
      </section>

      <section className="border-b border-black/10 dark:border-white/10">
        <div className="wrap section !py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Features briefing</p>
          <h2 className="display-2 mt-2">Your month, scheduled twice over</h2>
          <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">Live calendar: this month and next, posts auto-placed every Monday, Wednesday, Friday.</p>
          <div className="mt-6"><CampaignCalendar /></div>
        </div>
      </section>

      <section>
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Proof</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Loved by local owners</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["PS", "Salon owner", "Word-of-mouth only", "20+ calls a week after the tune-up"],
            ["DK", "Clinic owner", "Empty new calendar", "Full books in 3 months on reviews"],
            ["GR", "Gym owner", "Quiet trial desk", "Trials doubled with instant replies"],
          ].map(([ini, t, before, after]) => (
            <figure key={t} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand-deep dark:bg-white/10">{ini}</span>
                <div>
                  <figcaption className="text-sm font-semibold">— {t} (placeholder)</figcaption>
                  <p aria-label="5 out of 5 stars" className="flex gap-0.5">{[0,1,2,3,4].map((i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}</p>
                </div>
              </div>
              <blockquote className="mt-3 text-sm">Before: {before}. After: {after}.</blockquote>
            </figure>
          ))}
        </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <Reveal>
          <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="display-2">Start with a fixed-price audit</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              GBP audit + rank report + next-3-moves plan. DRAFT ₹2,999, credited toward your growth pack.
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm">
              <li>Entry → project → retainer ladder, capped quotas</li>
              <li>Exclusions + change-request rule on every offer</li>
              <li>No ranking or revenue guarantees — deliverables only</li>
            </ul>
            <a href="/pricing" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-black/15 px-5 font-semibold dark:border-white/20">See pricing</a>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
            <h3 className="font-bold">Request a callback</h3>
            <div className="mt-3"><LeadForm source="home" /></div>
          </div>
          </div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible defaultValue={FAQS[0].q} className="mt-6">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
