"use client";

import { useEffect, useState } from "react";
import { packMaps, type IconMapName } from "@/lib/nav-icons";

// Pack-aware glyph: renders the classic icon on the server (stable HTML/SEO),
// then swaps to the configured pack once the brand kit loads. Toggle is
// instant and needs no per-page changes beyond using this component.
export function PackIcon({ map, id, size = 19, className }: {
  map: IconMapName; id: string; size?: number; className?: string;
}) {
  const [pack, setPack] = useState("classic");
  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then((d) => {
      if (d.brand_icon_pack === "soft") setPack("soft");
    }).catch(() => {});
  }, []);
  const maps = packMaps(pack);
  const Icon = maps[map][id] ?? maps[map][Object.keys(maps[map])[0]];
  if (!Icon) return null;
  return <Icon size={size} className={className} aria-hidden />;
}
