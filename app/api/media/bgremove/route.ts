import { NextResponse } from "next/server";
import { z } from "zod";
import { bgJob, enqueueBgRemove } from "@/lib/bgremove";
import { sessionUser } from "@/lib/auth";

// POST {assetId, productId?} → queue background removal (returns instantly;
// the job swaps the image + updates the DB when done).
// GET ?id= → job status.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ assetId: z.number().int().min(1), productId: z.number().int().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad job" }, { status: 422 });
  const id = enqueueBgRemove(parsed.data.assetId, parsed.data.productId ?? 0);
  const { runLocal } = await import("@/lib/jobs");
  void runLocal("bgRemove", { jobId: id }).catch(() => {});
  try {
    const { inngest } = await import("@/lib/jobs");
    await inngest.send({ name: "app/media.bgremove", data: { jobId: id } }).catch(() => {});
  } catch { /* local runner covers on-device */ }
  return NextResponse.json({ ok: true, id, status: "queued" });
}

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const job = bgJob(Number(new URL(req.url).searchParams.get("id") || 0));
  return job ? NextResponse.json(job) : NextResponse.json({ error: "no job" }, { status: 404 });
}
