import { getDb } from "./store";

export interface KnownIdentity {
  name: string;
  phone: string;
  email: string;
  business: string;
  source: string;
}

// Look up whoever we already know by phone or email across leads, requests, users.
export function findKnown(phone?: string, email?: string): KnownIdentity | null {
  const d = getDb();
  if (phone) {
    const l = d.prepare("SELECT name, phone, businessType FROM Lead WHERE phone=? ORDER BY id DESC LIMIT 1").get(phone) as
      { name: string; phone: string; businessType: string } | undefined;
    if (l) return { name: l.name, phone: l.phone, email: email ?? "", business: l.businessType, source: "lead" };
    const p = d.prepare("SELECT name, phone FROM PartnerRequest WHERE phone=? ORDER BY id DESC LIMIT 1").get(phone) as
      { name: string; phone: string } | undefined;
    if (p) return { name: p.name, phone: p.phone, email: email ?? "", business: "", source: "partner" };
  }
  if (email) {
    const u = d.prepare("SELECT name, email FROM AppUser WHERE email=?").get(email.toLowerCase()) as
      { name: string | null; email: string } | undefined;
    if (u) return { name: u.name || "", phone: phone ?? "", email: u.email, business: "", source: "team" };
  }
  return null;
}

// Honorific addressing: "Mr./Ms. Sharma" when a surname exists, else first name.
export function addressAs(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `Mr./Ms. ${parts[parts.length - 1]}`;
  return parts[0] || "friend";
}

export function extractContact(text: string): { phone: string; email: string; rest: string } {
  const phone = (text.match(/\+?\d[\d\s-]{7,}\d/) || [])[0] ?? "";
  const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] ?? "";
  const rest = text.replace(phone, "").replace(email, "").replace(/[,;]+/g, " ").trim().slice(0, 80);
  return { phone, email, rest };
}
