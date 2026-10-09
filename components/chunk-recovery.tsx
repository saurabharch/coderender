"use client";

import { useEffect } from "react";

// Recovers stale-tab crashes after redeploys: if a JS chunk fails to load
// (old HTML referencing rebuilt assets), reload once for fresh references.
// Bounded: at most 2 reloads per session, then it stops — a persistently
// broken chunk must never spin the page forever. (An earlier version
// cleared its own guard on every mount, which re-armed the loop.)
const KEY = "cr_reloads";
const MAX = 2;

export function ChunkRecovery() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const msg = String(e.message || "");
      const src = (e.target as HTMLScriptElement)?.src || "";
      if (/chunk|Loading chunk|importing a module/i.test(msg + src)) {
        try {
          const n = Number(sessionStorage.getItem(KEY) || 0);
          if (n < MAX) {
            sessionStorage.setItem(KEY, String(n + 1));
            window.location.reload();
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);
  return null;
}
