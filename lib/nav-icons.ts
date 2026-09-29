import {
  Scissors, Dumbbell, Cake, Stethoscope, UtensilsCrossed, Bug, Car,
  Plane, Flower2, Hammer, LayoutGrid, Building2, MessageCircle, Tag, Mail, Info,
  Briefcase, Handshake, BookOpen, MapPin, Globe, Search, TrendingUp, Magnet, Bot,
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
