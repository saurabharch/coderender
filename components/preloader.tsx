"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

// Splash: default mark until the kit loads; custom loading icon when set.
// Empty loading icon falls back to the built-in mark (remove contract).
// Respects theme scope: dashboard-only kits never splash on public pages.
export function Preloader() {
  const [gone, setGone] = useState(false);
  const [icon, setIcon] = useState<string>("");
  useEffect(() => {
    const hide = () => setGone(true);
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    const t = setTimeout(hide, 1500);
    fetch("/api/brand").then((r) => r.json()).then((d) => {
      if ((d.brand_scope || "both") === "dashboard") return;
      const url = typeof d.brand_loading_icon === "string" ? d.brand_loading_icon : "";
      if (url) setIcon(url);
    }).catch(() => {});
    return () => {
      window.removeEventListener("load", hide);
      clearTimeout(t);
    };
  }, []);
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#fbf8f3] transition-opacity duration-300 dark:bg-black ${gone ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="animate-pulse">
        {icon
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={icon} alt="" style={{ height: 40, width: "auto" }} />
          : <Logo size={40} />}
      </div>
    </div>
  );
}
