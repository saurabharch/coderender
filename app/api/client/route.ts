import { NextResponse } from "next/server";
import { clientInfo } from "@/lib/client";

// Your own connection facts (IP, geo, language, device class) — nothing stored.
export async function GET(req: Request) {
  return NextResponse.json(clientInfo(req));
}
