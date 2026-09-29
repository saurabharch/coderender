import {
  siWhatsapp, siFacebook, siInstagram, siMessenger, siTelegram, siGoogle,
  siMeta, siZapier, siShopify, siWoo, siRazorpay, siGooglesheets, siZoho,
  siGooglecalendar,
} from "simple-icons";

// Open-licensed (CC0) brand glyphs for factual "works with / channel" rows.
// Never MBG proprietary assets; never implies endorsement.
const MAP: Record<string, { path: string; hex: string; title: string }> = {
  whatsapp: siWhatsapp, facebook: siFacebook, instagram: siInstagram,
  messenger: siMessenger, telegram: siTelegram, google: siGoogle, meta: siMeta,
  zapier: siZapier, shopify: siShopify, woo: siWoo, razorpay: siRazorpay,
  sheets: siGooglesheets, zoho: siZoho, calendar: siGooglecalendar,
};

export function BrandIcon({ name, size = 20 }: { name: string; size?: number }) {
  const icon = MAP[name];
  if (!icon) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={`#${icon.hex}`} role="img" aria-label={icon.title}>
      <path d={icon.path} />
    </svg>
  );
}
