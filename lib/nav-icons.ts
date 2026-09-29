import {
  Scissors, Dumbbell, Cake, Stethoscope, UtensilsCrossed, Bug, Car,
  Plane, Flower2, Hammer, LayoutGrid, Building2, MessageCircle, Tag, Mail, Info,
  Briefcase, Handshake, BookOpen, MapPin, Globe, Search, TrendingUp, Magnet, Bot,
  QrCode, Type, Calculator,
  type LucideIcon,
} from "lucide-react";

export const VERTICAL_ICONS: Record<string, LucideIcon> = {
  "salon-owners": Scissors,
  "gym-fitness-centres": Dumbbell,
  "bakers-cake-shops": Cake,
  "doctors-health-clinics": Stethoscope,
  "restaurant-bars": UtensilsCrossed,
  "pest-control": Bug,
  "car-garages-mechanics": Car,
  "tours-travels": Plane,
  "yoga-wellness": Flower2,
  "handyman-services": Hammer,
};

export const NAV_ICONS: Record<string, LucideIcon> = {
  services: LayoutGrid,
  industries: Building2,
  gbp: MessageCircle,
  pricing: Tag,
  contact: Mail,
  about: Info,
  careers: Briefcase,
  partner: Handshake,
  docs: BookOpen,
};

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  "google-business-profile": MapPin,
  "website-development": Globe,
  "local-seo": Search,
  "seo-marketing": TrendingUp,
  "lead-generation": Magnet,
  "chat-automation": Bot,
};

export const TOOL_ICONS: Record<string, LucideIcon> = {
  "gbp-booster-whatsapp-ai-agent": MessageCircle,
  "whatsapp-qr-generator": QrCode,
  "whatsapp-template-composer": Type,
  "pricing-calculator": Calculator,
};

// Colorful submenu glyphs: light saturated-600 / dark saturated-400.
const PALETTE = [
  "text-teal-600 dark:text-teal-400",
  "text-amber-600 dark:text-amber-400",
  "text-sky-600 dark:text-sky-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-rose-600 dark:text-rose-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-orange-600 dark:text-orange-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-pink-600 dark:text-pink-400",
];

export function palette(i: number): string {
  return PALETTE[i % PALETTE.length];
}

const ORB_BG = [
  "linear-gradient(135deg,#5eead4,#0d9488)",
  "linear-gradient(135deg,#fde68a,#d97706)",
  "linear-gradient(135deg,#7dd3fc,#0284c7)",
  "linear-gradient(135deg,#6ee7b7,#059669)",
  "linear-gradient(135deg,#c4b5fd,#7c3aed)",
  "linear-gradient(135deg,#fda4af,#e11d48)",
  "linear-gradient(135deg,#a5b4fc,#4f46e5)",
  "linear-gradient(135deg,#fdba74,#ea580c)",
  "linear-gradient(135deg,#67e8f9,#0891b2)",
  "linear-gradient(135deg,#f9a8d4,#db2777)",
];

export function orb(i: number): string {
  return ORB_BG[i % ORB_BG.length];
}
