"use client";

import { useEffect, useState } from "react";
import { Logo } from "./logo";

export function Preloader() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const hide = () => setGone(true);
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    const t = setTimeout(hide, 1500);
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
      <div className="animate-pulse"><Logo size={40} /></div>
    </div>
  );
}
