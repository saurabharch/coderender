"use client";

import { useEffect, useState, type ReactNode } from "react";

// Admin has no SEO needs; Mantine v9 trips this device's React copy during
// server prerender, so Mantine subtrees mount client-side only.
export function NoSsr({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
