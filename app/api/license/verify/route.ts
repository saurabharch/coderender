import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|license`, 30, 600_000))
    return NextResponse.json({ valid: false, error: "slow down" }, { status: 429 });
  const parsed = z.object({ key: z.string().min(4).max(80), product: z.string().max(80).default("default") })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false }, { status: 422 });
  const row = getDb().prepare("SELECT * FROM LicenseKey WHERE key=?").get(parsed.data.key) as
    { product: string; status: string; maxActivations: number; activations: number } | undefined;
  const valid = !!row && row.status === "active" &&
    (row.product === parsed.data.product || row.product === "*") &&
    row.activations < row.maxActivations;
  if (valid) getDb().prepare("UPDATE LicenseKey SET activations = activations + 1 WHERE key=?").run(parsed.data.key);
  return NextResponse.json({ valid });
}
