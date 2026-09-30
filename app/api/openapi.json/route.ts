import { NextResponse } from "next/server";
import { openApiDoc } from "@/lib/plugins/manifest";

export async function GET() {
  return NextResponse.json(openApiDoc());
}
