import Link from "next/link";
import type { ReactNode } from "react";

// Shared dashboard primitives: one card/skeleton/empty language so every
// admin console reads as the same product.

export function PageHead({ eyebrow, title, blurb }: { eyebrow: string; title: string; blurb?: string }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">{eyebrow}</p>
      <h1 className="display-1 mt-1">{title}</h1>
      {blurb && <p className="mb-4 mt-1 max-w-2xl text-sm text-zinc-500">{blurb}</p>}
    </>
  );
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, Icon, href }: {
  label: string; value: string; sub: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>; href?: string;
}) {
  const inner = (
    <>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand-deep"><Icon size={14} /></span>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </>
  );
  const cls = "glass rounded-2xl p-4 transition-transform hover:-translate-y-0.5";
  return href
    ? <Link href={href} className={cls} aria-label={`${label}: ${value}, ${sub}`}>{inner}</Link>
    : <div className={cls}>{inner}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-black/15 px-3 py-4 text-center text-sm text-zinc-500 dark:border-white/15">{children}</p>;
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="grid gap-2" aria-label="Loading" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
      ))}
    </div>
  );
}
