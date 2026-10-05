"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Slide { id: number; image: string; title: string; subtitle: string; cta: string; href: string; anim: string }

// CSS scroll-snap slider; animation per slide (slide/fade/zoom), auto-advance
// with pause on hover, reduced-motion respected globally.
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[Math.min(idx, slides.length - 1)];
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
      <div key={s.id} className={s.anim === "fade" ? "animate-[fadein_0.6s_ease]" : s.anim === "zoom" ? "animate-[zoomin_5s_ease]" : "animate-[slidein_0.5s_ease]"}>
        {s.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.image} alt={s.title} loading="eager" className="aspect-[21/9] w-full object-cover" />
        ) : <div aria-hidden className="aspect-[21/9] w-full bg-gradient-to-br from-brand/30 to-brand-soft" />}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-lg font-extrabold">{s.title}</p>
            {s.subtitle && <p className="text-sm text-zinc-500">{s.subtitle}</p>}
          </div>
          {s.cta && <Link href={s.href || "/"} className="sf-cta inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-bold">{s.cta} →</Link>}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3" role="tablist" aria-label="Slides">
          {slides.map((x, i) => (
            <button key={x.id} role="tab" aria-selected={i === idx} aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)} className={`h-2 min-h-0 min-w-0 rounded-full p-0 ${i === idx ? "w-6 bg-current" : "w-2 opacity-30"}`} />
          ))}
        </div>
      )}
      <style>{`@keyframes fadein{from{opacity:0}to{opacity:1}}@keyframes slidein{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}@keyframes zoomin{from{transform:scale(1.06)}to{transform:scale(1)}}`}</style>
    </div>
  );
}
