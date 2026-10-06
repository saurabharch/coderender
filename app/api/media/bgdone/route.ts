import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { swapTransparent } from "@/lib/bgremove";

// Client WASM worker result: transparent PNG bytes for a queued job.
// First-writer-wins with the Inngest job — whoever swaps first wins.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const jobId = Number(form?.get("jobId") || 0);
  const file = form?.get("file") as File | null;
  if (!jobId || !file || file.size < 1024 || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "job + transparent png required" }, { status: 422 });
  }
  const r = await swapTransparent(jobId, Buffer.from(await file.arrayBuffer()), "client-worker");
  return NextResponse.json(r.swapped ? { ok: true, url: r.url } : { ok: false, error: "job already settled" }, {
    status: r.swapped ? 200 : 409,
  });
}
