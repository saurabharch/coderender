import { NextResponse } from "next/server";
import { newChallenge } from "@/lib/captcha";
import { newSliderChallenge } from "@/lib/slider-captcha";

// Form-scoped challenges (no cookies): the builder's per-form captcha works
// regardless of which chat gate is active. Chat cookie endpoints stay
// provider-gated so both gates are never presented at once.
export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind") || "default";
  if (kind === "slider") return NextResponse.json(newSliderChallenge());
  return NextResponse.json(newChallenge());
}
