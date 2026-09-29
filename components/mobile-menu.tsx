"use client";

import { useRef, type ReactNode } from "react";

export interface MenuLink {
  h: string;
  l: string;
  icon?: ReactNode;
}

export function MobileMenu({ links }: { links: MenuLink[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  return (
    <details ref={ref} className="relative md:hidden">
      <summary aria-label="Open menu" className="flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center justify-center rounded-xl border border-black/10 dark:border-white/15 [&::-webkit-details-marker]:hidden">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        {links.map((x) => (
          <a key={x.h + x.l} href={x.h} onClick={close} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-medium hover:bg-black/5 dark:hover:bg-white/10">
            {x.icon}{x.l}
          </a>
        ))}
      </div>
    </details>
  );
}
