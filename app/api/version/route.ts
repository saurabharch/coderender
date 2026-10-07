import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/api-version";

// Version contract: current version, policy, machine-readable docs.
export async function GET() {
  return NextResponse.json({
    version: API_VERSION,
    policy: "Additive changes keep v1. Breaking changes ship as v2 alongside v1 with a 90-day v1 sunset notice. Clients must ignore unknown fields.",
    docs: ["/api/docs", "/api/openapi.json"],
  });
}
