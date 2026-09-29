import { BrandIcon } from "./brand-icon";
import { Logo } from "./logo";

// Realistic CSS iPhone whose screen mirrors the live hero section.
export function IPhoneMock() {
  return (
    <div aria-hidden className="mx-auto w-[280px] select-none">
      <div className="relative rounded-[3rem] border border-black/20 bg-zinc-900 p-2.5 shadow-2xl dark:border-white/20">
        <div className="absolute -left-[2px] top-20 h-10 w-[3px] rounded-l bg-zinc-700" />
        <div className="absolute -left-[2px] top-36 h-14 w-[3px] rounded-l bg-zinc-700" />
        <div className="absolute -right-[2px] top-28 h-16 w-[3px] rounded-r bg-zinc-700" />
        <div className="relative overflow-hidden rounded-[2.4rem] bg-[#fbf8f3]">
          <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="hero-glow px-4 pb-4 pt-12 text-center">
            <div className="flex justify-center"><Logo size={20} /></div>
            <p className="mt-2 text-[13px] font-extrabold leading-tight tracking-tight text-zinc-900">
              Your all-in-one growth team that delivers real revenue
            </p>
            <div className="mt-2.5 flex justify-center gap-1.5">
              <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold text-white">Free GBP Booster →</span>
              <span className="rounded-full border border-black/15 px-3 py-1.5 text-[10px] font-semibold">Book Demo</span>
            </div>
            <div className="mt-2.5 flex justify-center gap-1.5">
              {["whatsapp", "facebook", "instagram", "messenger", "telegram"].map((c) => (
                <span key={c} className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white">
                  <BrandIcon name={c} size={14} />
                </span>
              ))}
            </div>
            <div className="mt-2.5 rounded-2xl border border-black/10 bg-white p-2.5 text-left">
              <p className="text-[11px] font-bold text-zinc-900">Your Business #1</p>
              <p className="text-[10px] text-zinc-600">4.9 ★ (212) · <em className="text-emerald-600">Open now</em></p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <span className="rounded-full bg-zinc-900 py-1 text-center text-[10px] font-semibold text-white">Call</span>
                <span className="rounded-full border border-black/15 py-1 text-center text-[10px] font-semibold">Directions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
