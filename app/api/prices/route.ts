import { NextResponse } from "next/server";
import { sitePrices } from "@/lib/pricing";

export async function GET() {
  return NextResponse.json(sitePrices());
}
