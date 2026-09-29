"use client";

import { Phone, MessageCircle, CalendarCheck } from "lucide-react";
import { CONTACT } from "@/lib/site";

export function QuickBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/10 dark:bg-black/90 md:hidden">
      <div className="grid grid-cols-3">
        <a href={`tel:${CONTACT.phone}`} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold">
          <Phone size={18} /> Call Now
        </a>
        <a href={CONTACT.whatsapp} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold">
          <MessageCircle size={18} /> WhatsApp
        </a>
        <a href="/contact" className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold">
          <CalendarCheck size={18} /> Enquire
        </a>
      </div>
    </div>
  );
}
