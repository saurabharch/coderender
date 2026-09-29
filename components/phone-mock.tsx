import { Star, Phone, Navigation, Clock } from "lucide-react";

// Original CSS visual: a generic Maps listing card inside a phone frame.
// No third-party assets; business name is an obvious placeholder.
export function PhoneMock() {
  return (
    <div aria-hidden className="mx-auto w-64 rounded-[2rem] border border-black/15 bg-white p-3 shadow-xl dark:border-white/15 dark:bg-zinc-900">
      <div className="rounded-[1.5rem] bg-zinc-100 p-3 dark:bg-zinc-800">
        <div className="h-20 rounded-xl bg-gradient-to-br from-brand-soft to-brand/40 dark:from-brand-deep dark:to-black" />
        <p className="mt-2 text-sm font-bold">Your Business</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          4.9 <Star size={12} className="fill-amber-400 text-amber-400" /> (212) · Open now
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <span className="flex min-h-[36px] items-center justify-center gap-1 rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"><Phone size={12} /> Call</span>
          <span className="flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-black/15 text-xs font-semibold dark:border-white/20"><Navigation size={12} /> Directions</span>
        </div>
        <p className="mt-2 flex items-center gap-1 rounded-xl bg-white px-2 py-1.5 text-[11px] dark:bg-black"><Clock size={12} /> Replied in 38 seconds — “See you Saturday!”</p>
      </div>
    </div>
  );
}
