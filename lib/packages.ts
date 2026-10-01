export const GBP_AUDIT: [string, string][] = [
  ["Categories", "Primary + 9 secondaries match what you actually sell"],
  ["Hours", "Open hours, holidays, and special hours accurate"],
  ["Services", "Every service listed with SEO-rich descriptions"],
  ["Photos", "12+ geotagged photos, logo + cover current"],
  ["Reviews", "Rating, velocity, and 100% reply rate checked"],
  ["Posts", "Weekly cadence present for 90 days"],
  ["Q&A", "Owner-seeded answers on top 5 questions"],
  ["Products", "Top sellers listed with prices"],
  ["Bookings", "Booking/WhatsApp link live and tracked"],
  ["Citations", "NAP identical across top 20 directories"],
  ["Competitors", "Top 3 nearby rivals benchmarked"],
  ["Keywords", "Near-me map pack coverage measured"],
];

export const RELATED: Record<string, { integrations: string[]; automation: string[]; social: string[] }> = {
  "google-business-profile": {
    integrations: ["Google Business Profile", "Google Maps", "Google Sheets"],
    automation: ["Weekly SEO posts", "Review replies in 48h", "Rank tracking"],
    social: ["Review requests to happy buyers"],
  },
  "website-development": {
    integrations: ["Google Calendar", "WhatsApp Business API", "Google Analytics"],
    automation: ["Instant callback forms", "Chat widget qualification"],
    social: ["Social feed embeds"],
  },
  "local-seo": {
    integrations: ["Google Business Profile", "Justdial", "IndiaMART"],
    automation: ["Citation monitoring", "Monthly rank reports"],
    social: ["Location-tagged posts"],
  },
  "seo-marketing": {
    integrations: ["Google Search Console", "Google Analytics"],
    automation: ["Content calendar", "Technical audits"],
    social: ["Article distribution to socials"],
  },
  "lead-generation": {
    integrations: ["Meta Ads", "Google Ads", "Zoho CRM", "Google Sheets"],
    automation: ["Ad → WhatsApp capture", "Lead scoring + CRM sync"],
    social: ["Winning creatives recycled as posts"],
  },
  "chat-automation": {
    integrations: ["WhatsApp Business API", "Instagram", "Telegram", "Zapier"],
    automation: ["24/7 trained flows", "Broadcasts", "Human fallback"],
    social: ["Comment + DM triggers"],
  },
};
