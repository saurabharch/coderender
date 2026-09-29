# coderender — Reference Breakdown (MBG Card + Grexa)

Intent: pixel-adapt layout/rhythm/animation from refs. No hotlink, no verbatim copy. All copy rewritten, all assets rebuilt in `public/`.

## 1. `/` Section-Order Map (MBG order + Grexa depth)

| # | Section | Source | Layout intent (rewritten) | Required component | Animation intent |
|---|---------|--------|---------------------------|--------------------|------------------|
| 1 | Hero | MBG + Grexa hero | Left: eyebrow + H1 outcome + sub + dual CTA (Call / Enquire on `wa.me`); Right: phone/chat mock with 5 channel icons | `Hero` + `ChannelIcons` | Cinematic single focal gradient + float on mock; `prefers-reduced-motion: static` |
| 2 | Trust strip | MBG Featured-In + Grexa partner badges + logo wall | Single row: "Featured in" press logos → partner badges (Google+Meta) → client logo wall (19+) | `TrustStrip` (marquee) | Slow marquee, pause on hover, static wrap if reduced motion |
| 3 | Value band | MBG 3-value + AI chatbot | 3 cards (Sales / Loyalty / Satisfaction) + side AI-chatbot panel with sample Q/A | `ValueBand` | Stagger fade-up on scroll (once), no loop |
| 4 | Services slider | MBG 01–06 | Numbered 01–06 slider: GMB, Website Dev, Local SEO, SEO Marketing, Lead Gen, Chat Automation; 3 bullets each + Explore CTA | `ServicesSlider` (shadcn carousel) | Slider w/ dots + autoplay 6s, stop on interact/reduced motion |
| 5 | AI team deep-dives | Grexa 4-agent | 4 alternating rows: GBP agent / WhatsApp chat / WhatsApp marketing / Shared brain; 5–6 bullets each + mini visual | `AgentTeam` | Scroll reveal per row; static stack on mobile |
| 6 | Process / daily visibility | MBG "Everything business needs" | 6-tile grid: posts, reels, GBP rank, visuals, ads, instant answers (rewrite bridal-price example as generic offer card) | `ProcessGrid` | Cinematic mask bg, cards fade-up stagger |
| 7 | Integrations + gallery marquee | MBG gallery + integrations | Two marquees: (a) capability cards (replies, training, multichannel, growth), (b) integration chips (WA/FB/Insta/Telegram/Twilio/OpenAI/Calendar/Zapier) | `MarqueeRow` x2 | Opposite-direction marquees, pause on hover |
| 8 | Stats band | MBG stats | 4 stats (clients, messages, rating, cities) — real numbers only, no `0+` placeholders | `StatsBand` | Count-up on view; plain text if reduced motion |
| 9 | Showcase (industries preview) | Grexa 10-card grid | 10 cards + "many more": Gym, Doctors, Bakers, Salon, Restaurant, Pest, Garages, Tours, Yoga, Handyman → link to `/industries/[slug]` | `IndustryGrid` | Hover lift, no autoplay |
| 10 | Testimonials | MBG Loved-by + Grexa video + text | Video carousel (4) over text cards (3 w/ metric: calls/wk, footfall, impressions); aggregate rating header | `Testimonials` | Carousel + marquee fallback; autoplay off by default |
| 11 | Pricing teaser + GBP report banner | MBG pricing CTA + Grexa free-report | Split: left pricing-teaser (3 tiers, from-price only) → `/pricing`; right free GBP-rank-report form → `/api/leads` | `PricingTeaser`, `ReportBanner` | Static, focus-ring emphasis only |
| 12 | FAQ | MBG 5Q + Grexa 5Q | 5–6 accordions: what, how it works, time-to-value, pricing, support, cancel | `Faq` (Radix accordion) | Accordion height animation; instant if reduced motion |
| 13 | Final CTA + talk-to-team | MBG CTA + WA band + Grexa revenue CTA | Full-width banner: headline + Call / WhatsApp / Enquire; small print: city + email | `FinalCta` | Single gradient focal, no loop |

## 2. Global Chrome Spec

- **Sticky header banner:** top utility bar (offer text + Request-a-Call → `/contact`) persistent above sticky header. Header: logo left, nav (Services, Industries, Tool, Pricing, About), right: For-Sales-&-Support phone + Book-Demo CTA + WhatsApp icon + theme toggle (`light/dark/system`, default `system`, no FOUC). Sticky with blur bg on scroll.
- **Fat footer banner:** full footer on all routes. Columns: Features | Quick Links | Free Tools | Support | Industries (10 slugs) | Integrations | Resources/Partner | Contact (city, phone, support email). Bottom row: © + privacy/terms + social icons (lucide only). CTA mini-banner above footer columns on `/` only.
- **Mobile quick-action bar (`md:hidden` only):** fixed bottom horizontal bar, 3 equal 44px+ targets: Call / WhatsApp / Enquire. `safe-area-inset-bottom`, hides on `md+`, above footer content (`z-40`), respects reduced motion (no slide-in).

## 3. Pages + Slug Mapping

Shared template for all `industries/[slug]`: hero (vertical outcome) → pains → playbook (GBP+chat+marketing mapped) → sample visuals → metric testimonial → FAQ (3) → CTA → `/api/leads` (`businessType=slug`).

| Vertical | Slug |
|----------|------|
| Salon Owners | `industries/salon-owners` |
| Gym & Fitness Centres | `industries/gym-fitness-centres` |
| Bakers & Cake Shops | `industries/bakers-cake-shops` |
| Doctors & Health Clinics | `industries/doctors-health-clinics` |
| Restaurant & Bars | `industries/restaurant-bars` |
| Pest Control | `industries/pest-control` |
| Car Garages & Mechanics | `industries/car-garages-mechanics` |
| Tours & Travels | `industries/tours-travels` |
| Yoga & Wellness | `industries/yoga-wellness` |
| Handyman Services | `industries/handyman-services` |

- **Featured tool:** `tools/gbp-booster-whatsapp-ai-agent` — blocks: hero (Free AI Profile Booster) → how-it-works (3 steps) → sample report → review-reply demo → pricing tie-in → FAQ → CTA. Source: Grexa GBP deep-dive + free-report banner.
- **Company:** `/about` (story, team, city, contact) · `/careers` (roles, apply → leads `source=careers`) · `/pricing` (3 tiers + FAQ + CTA) · `/contact` (form → `/api/leads`: name/phone/businessType/source/message). All with header/footer chrome + final CTA.

## 4. Asset Rebuild List (`public/`, never hotlink)

- `public/brand/logo.svg`, `public/brand/press/*.svg` (re-drawn press marks), `public/brand/partners/*.svg` (generic badges, not Google/Meta art).
- `public/icons/channels/*.svg` (WA/FB/Insta/Messenger/Telegram/phone redrawn in lucide style).
- `public/mock/phone-chat.svg` (original chat mock), `public/showcase/industries/*.svg` (10 simple line illustrations).
- `public/banners/cta-bg.svg` (one focal gradient/mask per viewport, no purple-blue blob).
- `public/testimonials/posters/*.svg` (neutral video posters, no scraped faces).

**Copy-rewrite rule:** read ref intent → close tab → write fresh sentence with same job (same CTA target, same proof shape with own numbers). Never paste H1s, bullets, testimonials, FAQs verbatim. No lorem; every block ships real rewritten copy. Verify pricing/claims on vendor sites before publishing.

## 5. Sources

- https://mbgcard.in/ — fetched 2026-09-29 (hero, marquee, value band, services 01–06, integrations, stats, testimonials, FAQ, footer; via task evidence).
- https://grexa.ai/ — fetched 2026-09-29 (hero, 4-agent band, 10-vertical grid, AI-team deep-dives, badges, video/text testimonials, logo wall, GBP report banner, FAQ, footer; via task evidence).
- Note: `gmb.digitalmbg.com` unreachable at research time; excluded, no claims made from it.
