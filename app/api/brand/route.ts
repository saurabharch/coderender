import { NextResponse } from "next/server";
import { getPref } from "@/lib/store";
import { BRAND_DEFAULTS } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Public brand kit: logos, banners, PWA icons, palette, font, scope.
// Safe values only — never secrets.
export async function GET() {
  const out: Record<string, string> = {};
  for (const [k, fb] of Object.entries(BRAND_DEFAULTS)) {
    out[k] = getPref(k, fb);
  }
  return NextResponse.json(out);
}
