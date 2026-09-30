"use client";

import { Phone, MessageCircle, CalendarCheck, Bot } from "lucide-react";
import { CONTACT } from "@/lib/site";

const ITEMS = [
  { href: `tel:${CONTACT.phone}`, icon: Phone, label: "Call Now", action: undefined as string | undefined },
  { href: CONTACT.whatsapp, icon: MessageCircle, label: "WhatsApp", action: undefined as string | undefined },
  { href: "/contact", icon: CalendarCheck, label: "Enquire", action: undefined as string | undefined },
  { href: "", icon: Bot, label: "AI Chat", action: "cr:chat-toggle" },
];

export function QuickBar() {
  const fire = (action?: string) => {
    if (action) window.dispatchEvent(new Event(action));
  };
  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="glass mx-auto grid max-w-sm grid-cols-4 overflow-hidden rounded-full">
        {ITEMS.map(({ href, icon: Icon, label, action }) => (
          action ? (
            <button
              key={label}
              onClick={() => fire(action)}
              aria-label={label}
              className="glass-press flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold"
            >
              <Icon size={19} />
              {label}
            </button>
          ) : (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="glass-press flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold"
            >
              <Icon size={19} />
              {label}
            </a>
          )
        ))}
      </div>
    </div>
  );
}
