import { SERVICES } from "./services";
import { VERTICALS } from "./site";

export interface KBEntry {
  q: string;
  a: string;
  source: string;
}

const FAQS: KBEntry[] = [
  { q: "what is coderender", a: "CodeRender runs local growth for small businesses: Google profile, posts, reviews, WhatsApp replies, ads, and fast websites — so enquiries arrive while you focus on customers.", source: "FAQ" },
  { q: "how fast will i see enquiries results", a: "Most businesses see more calls and messages within 2–4 weeks once the profile tune-up and reply flows go live.", source: "FAQ" },
  { q: "do i need to be tech savvy", a: "No. If you can use WhatsApp, you can work with us. We handle setup and send a simple weekly summary.", source: "FAQ" },
  { q: "is my customer data safe", a: "Yes. Least-access credentials, client-owned accounts by default, secrets never stored in files.", source: "FAQ" },
  { q: "what does it cost price pricing", a: "Start with a fixed-price GBP audit (DRAFT ₹2,999, credited toward a pack), then a per-vertical growth pack or a capped monthly retainer. All prices stay DRAFT until verified with you.", source: "FAQ" },
  { q: "is there a free trial demo", a: "Yes — start with the fixed-price audit, credited toward your growth pack if you continue. Book a free demo from the contact page any time.", source: "FAQ" },
  { q: "how fast go live implementation", a: "Reply flows and profile tune-up in week 1–2; the full weekly rhythm from week 2. Retainer momentum compounds from month 2–3.", source: "FAQ" },
  { q: "does it connect crm zoho hubspot", a: "Yes — Google Sheets out of the box; Zoho and HubSpot-style CRMs on project plans, with contacts sync and event-triggered messages.", source: "FAQ" },
  { q: "google business profile ranking maps gmb", a: "We tune your profile (categories, hours, services, photos), publish weekly SEO posts for local keywords, and answer every review — the combination that lifts Maps and Search visibility over weeks, not overnight.", source: "GBP guide" },
  { q: "google reviews manage reply reputation", a: "Every Google review gets an SEO-rich reply within 48 hours, and happy customers get review requests automatically.", source: "GBP guide" },
  { q: "social media instagram facebook handling posts", a: "A month of Google, Instagram and Facebook posts scheduled and published on time, plus reels support and DM auto-replies with comment triggers.", source: "Social guide" },
  { q: "whatsapp automation chatbot replies", a: "WhatsApp Business API setup with templates, flows trained on your prices and tone, 24/7 lead qualification, and broadcasts to past customers. Live in week 2.", source: "Automation guide" },
  { q: "virtual customer support hours availability", a: "The AI answers in seconds, 24/7. Humans are on WhatsApp Mon–Sat and reply within one business day.", source: "Support guide" },
  { q: "how contact reach talk human phone", a: "WhatsApp or call +919831778894, email hello@coderender.in, or the contact form — a real human replies within one business day, Mon–Sat.", source: "Contact" },
];

const POLICIES: KBEntry[] = [
  { q: "raise ticket support help contact human file request", a: "File online: [Raise a ticket](/support/ticket) — tracked, human reply in one business day. Urgent: call Mon–Sat 10:30 AM–7 PM IST. More ways: [Support hub](/support).", source: "Support" },
  { q: "faq frequently asked questions pricing timeline", a: "Top answers on pricing, timelines, data safety, refunds, and support: [FAQs](/faqs).", source: "FAQs" },
  { q: "fraud scam impersonation report misuse complaint", a: "Suspect fraud? Stop sharing OTPs/codes, verify contacts (only our email, phone, and this site are us), never pay personal UPI IDs. File fast-track: [Complaint & Fraud](/complaints) or [raise a ticket](/support/ticket) with “FRAUD:”.", source: "Fraud Resolution" },
  { q: "grievance redressal policy complaint escalate officer where read", a: "Escalation ladder: 1) support ticket (7 working days), 2) grievance officer via email with “Grievance” (30 days), 3) founder review (15 days). Start: [Grievance Redressal](/grievance).", source: "Grievance Policy" },
  { q: "privacy policy data safe personal information", a: "We collect only callback essentials (name, phone, business, message), never sell data, use least-access credentials, and delete on request within 7 working days. Full detail: [Privacy Policy](/privacy).", source: "Privacy Policy" },
  { q: "terms conditions agreement payment scope", a: "Written quotes win: 50% advance on projects, monthly retainers in advance, two revision rounds included, you always own accounts and data. Full terms: [Terms & Conditions](/terms).", source: "Terms" },
  { q: "refund policy money back cancellation", a: "Refunds: not started = 100% back; started = pay only for delivered milestones; retainers run to month-end after 15-day notice. Ad spend and domains follow provider policies. Ask from [Refund Policy](/refund) or [raise a ticket](/support/ticket).", source: "Refund Policy" },
];

export const KB: KBEntry[] = [
  ...SERVICES.map((s) => ({
    q: `${s.title} ${s.tagline}`,
    a: `${s.title}: ${s.tagline} Includes: ${s.includes.join("; ")}. ${s.timeline}. ${s.priceHint}.`,
    source: "service briefing",
  })),
  ...VERTICALS.map((v) => ({
    q: `${v.label} marketing ${v.blurb}`,
    a: `${v.label}: ${v.blurb}`,
    source: "industry coverage",
  })),
  ...FAQS,
  ...POLICIES,
];

const STOP = new Set("what,how,does,do,is,are,the,a,an,and,or,for,to,of,in,on,my,you,your,i,it,with,me,us,please,tell,give,need,want,know,about".split(","));

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9₹]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

export function kbSearch(query: string, limit = 2): { entry: KBEntry; score: number }[] {
  const qs = tokens(query);
  if (qs.length === 0) return [];
  return KB.map((entry) => {
    const es = new Set(tokens(`${entry.q} ${entry.a}`));
    const hit = qs.filter((w) => es.has(w) || [...es].some((e) => e.startsWith(w.slice(0, 4)) && w.length > 4)).length;
    return { entry, score: hit / qs.length };
  })
    .filter((r) => r.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
