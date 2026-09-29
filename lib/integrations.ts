export const INTEGRATIONS = [
  { name: "WhatsApp Business API", icon: "whatsapp", blurb: "Broadcasts, templates, 2-way chats" },
  { name: "Google Business Profile", icon: "google", blurb: "Posts, reviews, rank tracking" },
  { name: "Instagram", icon: "instagram", blurb: "DM auto-replies + comment triggers" },
  { name: "Facebook + Messenger", icon: "messenger", blurb: "Lead qualification flows" },
  { name: "Telegram", icon: "telegram", blurb: "Broadcasts + support bots" },
  { name: "Google Sheets", icon: "sheets", blurb: "Lead sync, no CRM needed" },
  { name: "Zoho CRM", icon: "zoho", blurb: "Contacts, deals, event triggers" },
  { name: "Shopify", icon: "shopify", blurb: "Abandoned-cart recovery chats" },
  { name: "WooCommerce", icon: "woo", blurb: "Order updates on WhatsApp" },
  { name: "Zapier", icon: "zapier", blurb: "5,000+ app automations" },
  { name: "Razorpay", icon: "razorpay", blurb: "Payment links inside chat" },
  { name: "Google Calendar", icon: "calendar", blurb: "Bookings straight to calendar" },
];

export function integrationInitial(name: string): string {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
}
