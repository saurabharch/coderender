"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Badge, Collapse, Progress, SegmentedControl, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Copy } from "lucide-react";
import { NoSsr } from "@/components/no-ssr";

// Mantine use-click-outside recipe: close popovers/dropdowns on outside tap.
export function useClickOutside<T extends HTMLElement>(onOut: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onOut]);
  return ref;
}

// Mantine use-in-viewport recipe: render heavy charts only when scrolled into
// view so long dashboards stay smooth on phones.
export function useInViewport<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const el = ref.current;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const ob = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); ob.disconnect(); } },
      { threshold },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [seen, threshold]);
  return { ref, seen };
}

// Initials avatar for people lists (staff, customers, leads): one consistent
// face across kanban, CRM, people and POS instead of per-page glyph styles.
export function AvatarInitials({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <NoSsr fallback={
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-brand/10 font-bold text-brand-deep ${size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-sm"}`}>{initials}</span>
    }>
      <Avatar name={name} color="brand" size={size === "sm" ? "sm" : "md"} radius="xl">{initials}</Avatar>
    </NoSsr>
  );
}

// Mantine Progress recipe for background jobs: poll text becomes a real bar
// (queued → working → done/fail) instead of "3/24" strings.
export function JobProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <NoSsr fallback={<p className="text-xs text-zinc-500">{label} ({done}/{total})</p>}>
      <div className="grid gap-1">
        <Progress value={pct} size="sm" radius="xl" color={pct >= 100 ? "teal" : "brand"} aria-label={label} />
        <p className="text-xs text-zinc-500">{label} ({done}/{total})</p>
      </div>
    </NoSsr>
  );
}
// Shared icon button (mantine-custom-components recipe: compose Mantine
// Tooltip over a native button with project tokens). One 44px target, one
// accessible name, hover hint on desktop, silent on touch.
export function IconBtn({ label, hint, onClick, disabled, tone = "border", large, extra, children }: {
  label: string; hint?: string; onClick: () => void; disabled?: boolean;
  tone?: "border" | "brand" | "dark"; large?: boolean;
  extra?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  children: ReactNode;
}) {
  const toneCls = tone === "brand"
    ? "bg-brand px-4 text-white"
    : tone === "dark"
      ? "bg-black text-white dark:bg-white dark:text-black"
      : "border border-black/15 text-brand-deep dark:border-white/20";
  const sizeCls = large ? "min-h-[48px] min-w-[56px]" : "min-h-[44px] min-w-[52px]";
  const cls = `flex ${sizeCls} items-center justify-center rounded-xl disabled:opacity-40 ${toneCls}`;
  const btn = (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={hint ?? label} className={cls} {...extra}>
      {children}
    </button>
  );
  return (
    <NoSsr fallback={btn}>
      <Tooltip label={hint ?? label} openDelay={400}>{btn}</Tooltip>
    </NoSsr>
  );
}

export function CopyBtn({ value, label }: { value: string; label: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      notifications.show({ title: "Copied", message: label, color: "teal" });
    } catch {
      notifications.show({ title: "Copy failed", message: "Long-press to copy manually.", color: "red" });
    }
  }
  return (
    <button onClick={() => void copy()} aria-label={`Copy ${label}`} title={`Copy ${label}`}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">
      <Copy size={16} />
    </button>
  );
}

const TONE: Record<string, string> = {
  draft: "gray", sent: "blue", paid: "green", done: "green", active: "green",
  booked: "yellow", assigned: "blue", "in-progress": "orange", failed: "red",
  expired: "red", low: "orange", off: "gray", on: "teal",
  proposed: "yellow", confirmed: "blue", cancelled: "gray",
  created: "gray", packed: "blue", shipped: "orange", delivered: "green", rto: "red",
  open: "green", closed: "gray", launched: "teal", submitted: "blue", approved: "teal",
  rejected: "red", screening: "blue", interview: "orange", offered: "blue", hired: "green",
  declined: "red", booked: "blue", applied: "gray",
  offered: "blue", withdrawn: "gray", hired: "green",
};

export function StatusBadge({ status }: { status: string }) {
  const color = TONE[status] ?? "gray";
  return (
    <NoSsr fallback={<span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{status}</span>}>
      <Badge color={color} variant="light" size="sm" radius="xl">{status}</Badge>
    </NoSsr>
  );
}

// Mantine use-collapse recipe: advanced sections collapse, open by default so
// nothing is ever hidden from functionality or tests.
export function CollapsibleCard({ title, meta, children, defaultOpen = true }: {
  title: string; meta?: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex min-h-[44px] w-full flex-wrap items-center justify-between gap-2 text-left">
        <span className="font-bold">{title} {meta && <span className="text-xs font-normal text-zinc-500">{meta}</span>}</span>
        <span aria-hidden className="text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>
      <NoSsr fallback={open ? <div className="mt-2">{children}</div> : null}>
        <Collapse expanded={open}>
          <div className="mt-2">{children}</div>
        </Collapse>
      </NoSsr>
    </div>
  );
}

// Mantine SegmentedControl recipe: radio-group semantics, full-width on
// mobile, native-select SSR fallback so first paint never breaks.
export function Seg({ value, onChange, data, label }: {
  value: string; onChange: (v: string) => void;
  data: { value: string; label: string }[]; label: string;
}) {
  return (
    <NoSsr fallback={
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
        {data.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
    }>
      <SegmentedControl value={value} onChange={onChange} data={data} aria-label={label} fullWidth />
    </NoSsr>
  );
}
