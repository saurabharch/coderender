"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Collapse, SegmentedControl } from "@mantine/core";
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

// Mantine use-clipboard recipe: copy + Notifications feedback (no silent fail).
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
