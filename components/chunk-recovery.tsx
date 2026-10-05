"use client";

import { useEffect } from "react";

// Recovers stale-tab crashes after redeploys: if a JS chunk fails to load
// (old HTML referencing rebuilt assets), reload once for fresh references.
// The sessionStorage flag prevents any reload loop.
export function ChunkRecovery() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const msg = String(e.message || "");
      const src = (e.target as HTMLScriptElement)?.src || "";
      if (/chunk|Loading chunk|importing a module/i.test(msg + src)) {
        try {
          if (!sessionStorage.getItem("cr_reloaded")) {
            sessionStorage.setItem("cr_reloaded", "1");
            window.location.reload();
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("error", onError, true);
    try { sessionStorage.removeItem("cr_reloaded"); } catch { /* ignore */ }
    return () => window.removeEventListener("error", onError, true);
  }, []);
  return null;
}
