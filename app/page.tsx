import Link from "next/link";
import { CONTACT, VERTICALS } from "@/lib/site";
import { LeadForm } from "@/components/lead-form";
import { Reveal } from "@/components/reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SERVICES = [
  { n: "01", title: "Google Business Profile", desc: "Profile tune-up, Maps visibility, reviews handled daily.", points: ["Accurate listings", "Near-me visibility", "Review replies"] },
  { n: "02", title: "Website Development", desc: "Fast, mobile-first pages that turn visits into calls.", points: ["Custom design", "Responsive layouts", "SEO-ready speed"] },
  { n: "03", title: "Local Business SEO", desc: "Show up first when locals search for what you do.", points: ["Local keywords", "Citations + NAP", "Local links"] },
  { n: "04", title: "SEO Marketing", desc: "Steady organic growth from content that answers real queries.", points: ["Content plan", "Authority links", "Technical audits"] },
  { n: "05", title: "Lead Generation", desc: "Campaigns and funnels that fill your pipeline.", points: ["Targeted ads", "High-converting funnels", "CRM-ready capture"] },
  { n: "06", title: "Chat Automation", desc: "WhatsApp + Instagram replies in seconds, in your tone.", points: ["WhatsApp Business API", "Trained flows", "24/7 qualification"] },
];

const FAQS = [
  { q: "What does CodeRender do?", a: "We run your local growth: Google profile, posts, reviews, WhatsApp replies, ads, and a fast website — so enquiries arrive while you focus on customers." },
  { q: "How fast will I see enquiries?", a: "Most businesses see more calls and messages within 2–4 weeks once the profile tune-up and reply flows go live." },
  { q: "Do I need to be tech-savvy?", a: "No. If you can use WhatsApp, you can work with us. We handle setup and send you a simple weekly summary." },
  { q: "Is my customer data safe?", a: "Yes. We use least-access credentials, never store secrets in files, and work on client-owned accounts by default." },
  { q: "What does it cost?", a: "Start with a fixed-price GBP audit (DRAFT ₹2,999), then a per-vertical growth pack or a capped monthly retainer. All prices stay DRAFT until verified with you." },
];

export default function Home() {
  return (
    <>
      <section className="hero-glow">
        <div className="wrap pb-10 pt-14 text-center md:pt-20">
          <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Marketing platform for local businesses</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-balance text-4xl font-extrabold leading-[1.02] tracking-tight md:text-6xl">
            Your all-in-one growth team that delivers real revenue
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
            Google profile, WhatsApp replies, reviews, posts, and ads — handled daily so you can focus on your craft.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={CONTACT.whatsapp} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 font-semibold text-white dark:bg-white dark:text-zinc-900">Free GBP Booster →</a>
            <a href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 font-semibold dark:border-white/20">Book Free Demo</a>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Trusted by owners in 10 local verticals · Salons · Clinics · Gyms · Restaurants · and more
          </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Agents" className="border-y border-black/10 bg-white py-0 dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-[#fbf8f3] p-8 dark:border-white/10 dark:bg-black md:col-span-2 md:row-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Lead agent</p>
              <p className="mt-4 max-w-[18ch] text-4xl font-extrabold leading-none tracking-tight md:text-5xl">
                More calls from Google, every week.
              </p>
              <p className="mt-6 max-w-[44ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Keywords, SEO posts, and review replies tuned for Maps + Search — the profile becomes your hardest-working salesperson.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fbf8f3] p-6 dark:border-white/10 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Chat agent</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">24/7</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Every WhatsApp + DM answered in seconds, in your tone.</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fbf8f3] p-6 dark:border-white/10 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Marketing agent</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">Repeat</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Offers and reminders sent to the right past customers.</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-[#fbf8f3] p-6 dark:border-white/10 dark:bg-black md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Shared brain</p>
              <p className="mt-3 text-2xl font-extrabold tracking-tight">Leads, sales, and chats in one place for all agents.</p>
            </div>
          </div>
          </Reveal>
        </div>
      </section>

      <section id="verticals">
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Industries</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Built for businesses like yours</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERTICALS.map((v) => (
            <Link key={v.slug} href={`/industries/${v.slug}`} className="rounded-2xl border border-black/10 p-5 hover:border-brand dark:border-white/10">
              <p className="font-bold">{v.label}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{v.blurb}</p>
            </Link>
          ))}
        </div>
        </div>
      </section>

      <section id="services" className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Our services</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Digital services we offer</h2>
          <div className="marquee mt-6 pb-2">
            {SERVICES.map((s) => (
              <article key={s.n} className="w-72 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
                <p className="text-xs font-bold text-brand-deep">{s.n} / 06</p>
                <h3 className="mt-1 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.desc}</p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Proof</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Loved by local owners</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Salon owner", "From word-of-mouth only to 20+ calls a week after the local tune-up."],
            ["Clinic owner", "New practice, full calendar in 3 months. Reviews do the talking now."],
            ["Gym owner", "Trials doubled once Maps rank and instant replies went live."],
          ].map(([t, d]) => (
            <figure key={t} className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
              <blockquote className="text-sm">“{d}”</blockquote>
              <figcaption className="mt-2 text-sm font-semibold">— {t} (placeholder)</figcaption>
            </figure>
          ))}
        </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section grid gap-8 !py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Start with a fixed-price audit</h2>
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
      </section>

      <section>
        <div className="wrap section">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">FAQ</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6">
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
