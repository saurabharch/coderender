"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SEEN_KEY = "cr_lead_popup_seen";
const MIN_SECONDS = 20;

// Lead-capture dialog: appears once per session, only after 20s on page AND
// the visitor reaches the bottom (footer in view). Public pages only — never
// inside admin/login. Posts to /api/leads like every other enquiry form.
export function LeadCaptureModal() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [elapsed, setElapsed] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [biz, setBiz] = useState("");
  const [state, setState] = useState<"form" | "busy" | "done" | "error">("form");

  const publicPage = !path.startsWith("/admin") && path !== "/login";

  useEffect(() => {
    if (!publicPage) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* ignore */ }
    if (seen) return;
    const timer = setTimeout(() => setElapsed(true), MIN_SECONDS * 1000);
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      if (nearBottom) setAtBottom(true);
    };
    // Footer sentinel covers short pages where no scroll is possible.
    const footer = document.querySelector("footer");
    const io = footer && "IntersectionObserver" in window
      ? new IntersectionObserver((es) => {
          if (es.some((e) => e.isIntersecting)) setAtBottom(true);
        }, { threshold: 0.2 })
      : null;
    if (footer && io) io.observe(footer);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      if (io) io.disconnect();
    };
  }, [publicPage]);

  useEffect(() => {
    if (publicPage && elapsed && atBottom) {
      setShow(true);
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    }
  }, [publicPage, elapsed, atBottom]);

  if (!show) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy" || state === "done") return;
    setState("busy");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), phone: phone.trim(),
          businessType: biz.trim() || "general",
          source: "scroll-popup", message: "Scroll-to-bottom lead capture",
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog" aria-modal="true" aria-label="Get a free growth audit">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-zinc-900 shadow-2xl dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold tracking-tight">Want more customers?</p>
            <p className="mt-0.5 text-sm text-zinc-500">Free growth audit — reply within one business day.</p>
          </div>
          <button onClick={() => setShow(false)} aria-label="Dismiss"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-black/15 text-lg dark:border-white/20">✕</button>
        </div>
        {state === "done" ? (
          <p role="status" className="mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Noted ✓ We&apos;ll reach out within one business day.</p>
        ) : (
          <form onSubmit={submit} className="mt-3 grid gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80}
              placeholder="Your name" autoComplete="name"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={7} maxLength={20}
              placeholder="Phone / WhatsApp" inputMode="tel" autoComplete="tel"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <input value={biz} onChange={(e) => setBiz(e.target.value)} maxLength={60}
              placeholder="Business type (salon, clinic…)" 
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button disabled={state === "busy"}
              className="min-h-[48px] rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50">
              {state === "busy" ? "Sending…" : "Get my free audit →"}</button>
            {state === "error" && <p role="alert" className="text-xs font-semibold text-red-600">Couldn&apos;t send — check the number and retry.</p>}
            <Link href="/contact" onClick={() => setShow(false)} className="text-center text-xs font-semibold text-brand-deep">
              Prefer to talk? Contact us directly</Link>
          </form>
        )}
      </div>
    </div>
  );
}
