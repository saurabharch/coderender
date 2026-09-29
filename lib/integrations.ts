export const INTEGRATIONS = [
  { name: "WhatsApp Business API", blurb: "Broadcasts, templates, 2-way chats" },
  { name: "Google Business Profile", blurb: "Posts, reviews, rank tracking" },
  { name: "Instagram", blurb: "DM auto-replies + comment triggers" },
  { name: "Facebook + Messenger", blurb: "Lead qualification flows" },
  { name: "Telegram", blurb: "Broadcasts + support bots" },
  { name: "Google Sheets", blurb: "Lead sync, no CRM needed" },
  { name: "Zoho CRM", blurb: "Contacts, deals, event triggers" },
  { name: "Shopify", blurb: "Abandoned-cart recovery chats" },
  { name: "WooCommerce", blurb: "Order updates on WhatsApp" },
  { name: "Zapier", blurb: "5,000+ app automations" },
  { name: "Razorpay", blurb: "Payment links inside chat" },
  { name: "Google Calendar", blurb: "Bookings straight to calendar" },
];

export function integrationInitial(name: string): string {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
}
