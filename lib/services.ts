export interface ServiceBriefing {
  n: string;
  slug: string;
  title: string;
  tagline: string;
  includes: [string, string, string, string];
  excludes: [string, string];
  timeline: string;
  priceHint: string;
}

export const SERVICES: ServiceBriefing[] = [
  { n: "01", slug: "google-business-profile", title: "Google Business Profile",
    tagline: "Your Maps listing tuned to ring, not just rank.",
    includes: ["Profile tune-up: categories, hours, services, photos", "Weekly SEO posts written for local keywords", "Every review answered within 48 hours", "Monthly rank + calls report you can read in 2 minutes"],
    excludes: ["Fake reviews or review gating", "Guaranteed #1 rankings"],
    timeline: "Tune-up week 1 · rhythm from week 2",
    priceHint: "DRAFT from ₹14,999 / project" },
  { n: "02", slug: "website-development", title: "Website Development",
    tagline: "Fast pages that turn visits into calls.",
    includes: ["Mobile-first design in your voice", "Call/WhatsApp CTAs on every screen", "Local SEO basics: titles, maps, speed", "Launch in weeks, not quarters"],
    excludes: ["Custom web apps or portals", "Content you never approve"],
    timeline: "Design week 1–2 · build week 3–4",
    priceHint: "DRAFT from ₹29,999 / project" },
  { n: "03", slug: "local-seo", title: "Local Business SEO",
    tagline: "Show up first when neighbours search.",
    includes: ["Hyper-local keyword map per service", "Citations + NAP consistency cleanup", "Local links from real directories", "Quarterly content refresh"],
    excludes: ["Link farms or paid link schemes", "Overnight rank promises"],
    timeline: "Cleanup month 1 · compounding from month 3",
    priceHint: "DRAFT from ₹11,999 / mo" },
  { n: "04", slug: "seo-marketing", title: "SEO Marketing",
    tagline: "Steady organic growth, no ad spend.",
    includes: ["Content plan answering real customer queries", "Authority outreach, one link at a time", "Technical audits with fixes prioritized", "Traffic + leads dashboard monthly"],
    excludes: ["AI-spun content farms", "Vanity traffic without enquiries"],
    timeline: "Audit month 1 · momentum month 3+",
    priceHint: "DRAFT from ₹11,999 / mo" },
  { n: "05", slug: "lead-generation", title: "Lead Generation",
    tagline: "A pipeline you can count on Mondays.",
    includes: ["Targeted Meta + Google campaigns", "Funnels with WhatsApp-first capture", "Weekly creative refresh from winners", "Cost-per-lead reported honestly"],
    excludes: ["Purchased lead lists", "Spend without a cap you set"],
    timeline: "Launch week 2 · tuned weekly",
    priceHint: "DRAFT from ₹19,999 / mo + ad spend" },
  { n: "06", slug: "chat-automation", title: "Chat Automation",
    tagline: "Every message answered in seconds.",
    includes: ["WhatsApp Business API setup + templates", "Flows trained on your prices and tone", "Lead qualification before a human steps in", "Broadcasts to past customers"],
    excludes: ["Spam blasts to cold numbers", "Bots pretending to be human doctors/lawyers"],
    timeline: "Live in week 2 · trained monthly",
    priceHint: "DRAFT from ₹14,999 / project" },
];
