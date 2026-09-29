# mbgcard.in — complete section/design inventory (researched 2026-09-30, rewritten — never copied)

## Pages crawled
`/` (full), `/about-us/`, `/contact-us/`, `/faqs/` (full Q/A bank), plus search snippets for
`gmb.digitalmbg.com` (GMB management app: performance insights, profile/reviews/posts/photos).

## Global chrome (all pages)
- Top banner: toll-free + Request a Call, repeated verbatim top AND above footer.
- Sticky header: logo left, "For Sales & Support" call link, Book/demo CTA right.
- Mobile: horizontal floating quick-action bar (call/WhatsApp/enquiry).
- Fat footer: Features / Quick Links (Privacy, Grievance, Terms, Refund) / Free Tools
  (WA template generator, pricing calculator, QR generator) / Support (FAQs, Raise a Ticket,
  Grievance, Fraud resolution) / Industries (3) / Integrations (8) / Resources (Docs) /
  Partner (Become Partner/Affiliate) / Contact block + social icons + bottom legal bar.
- Final CTA banner above footer on every page ("Still Have Questions?" + WhatsApp + Call).

## Home section order
1 Hero (badge: official WA API + Meta; H1; channel icons; Call/Enquire) → 2 marquee gallery →
3 value trio (Boost Sales / Build Loyalty / Satisfaction) + AI chatbot + auto-support →
4 "everything you need" daily-visibility band (posts, reels, GBP rank, visuals, ads, instant
answers with price example, reputation) → 5 Featured-In press strip → 6 services slider 01–06
(GMB, Web Dev, Local SEO, SEO Marketing, Lead Gen, Chat Automation; 3 bullets + Explore CTA) →
7 integrations marquee (19 tiles) → 8 stats band → 9 daily-visibility CTA → 10 testimonials
(30k claim) → 11 WhatsApp talk-to-team band → 12 FAQ (5) → 13 CTA banner → footer.

## About page blocks
Mission/vision cards, values trio (trust, customer success, innovation), journey timeline
(2020 founded → 2021 platform → 2022 global → 2023 AI), achievements band (their numbers —
DO NOT reuse), 4 channel services with Read-More→WhatsApp, integrations grid, WhatsApp band.

## Contact page blocks
"Skip the forms" WhatsApp-first hero + hours (Mon–Sat 10:30–7), mission card, FAQ teaser,
social row. (Our contact already mirrors this shape.)

## FAQ bank topics (rewrite, don't paste)
Product, WA API, benefits, scheduling, Instagram, CRM (Zoho/HubSpot/Salesforce), free trial,
security, mobile, support, industries, go-live speed (their claim: a day — ours: weeks, honest),
Zoho event triggers + tracking, education/real-estate/healthcare verticals, partner tiers/fees.

## Design system (observed → our tokens)
- Paper white `#ffffff`→ ours warm `#fbf8f3`; ink near-black; dark footer `#09090b`-ish → ours `zinc-950/black`.
- Primary action green (WhatsApp) → ours teal `brand #0d9488` (+ deep `#0f766e`, soft `#ccfbf1`).
- Accent for proof: amber stars `#fbbf24`-ish → ours `amber-400`. Danger/red reserved for errors.
- Type: grotesk/geometric sans, tight display tracking, small-caps kickers, ~5:1 display/body jump.
- Radius: pills for CTAs (`rounded-full`), `rounded-2xl` cards, circular avatar cutouts.
- Motion: marquees (gallery + integrations), numbered slider, chat-mock reveals, timeline;
  all gated behind `prefers-reduced-motion` on our side.

## Asset-rebuild map (original only, in `public/` + CSS)
- Logo: `components/logo.tsx` (geometric C-mark, no copying of MBG webp).
- Channel icons: lucide (MessageCircle, Facebook, Instagram, Send) — never their pngs.
- Integration tiles: initial-letter badges + names (text, factual "works with").
- Gallery/stat/press imagery: CSS mocks + honest placeholders (see `social-proof.md`).
- Avatars: initial circles. Phone mock: `components/phone-mock.tsx`.
