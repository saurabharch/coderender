import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/slider-captcha";

// Chat + forms read the single active gate from here — never both at once.
export async function GET() {
  return NextResponse.json({ provider: activeProvider() });
}
