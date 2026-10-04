import { NextResponse } from "next/server";
import { confirmPayout } from "@/lib/partners";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const { id } = await confirmPayout(String(token).slice(0, 64));
    return NextResponse.json({ ok: true, id, settled: true });
  } catch {
    return NextResponse.json({ error: "nothing to confirm" }, { status: 404 });
  }
}
