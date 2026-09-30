"use client";

import { useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

function send(type: string, extra: Record<string, string> = {}) {
  try {
    const fp = localStorage.getItem("cr_fp") ?? undefined;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, path: location.pathname, fingerprint: fp, data: extra.label }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never break the page */ }
}

export function Tracker() {
  useEffect(() => {
    let alive = true;
    FingerprintJS.load().then((fp) => fp.get()).then((r) => {
      if (!alive) return;
      try { localStorage.setItem("cr_fp", r.visitorId); } catch { /* ignore */ }
      send("page_view");
    }).catch(() => send("page_view"));
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("[data-track],a,button");
      if (!el) return;
      const label = (el as HTMLElement).dataset.track ?? el.textContent?.trim().slice(0, 80) ?? "click";
      send("click", { label });
    };
    document.addEventListener("click", onClick);
    return () => {
      alive = false;
      document.removeEventListener("click", onClick);
    };
  }, []);
  return null;
}
