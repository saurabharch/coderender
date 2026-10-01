import { NextResponse } from "next/server";
import { toggleLike } from "@/lib/comments";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (rateLimited(`${clientKey(undefined, req)}|like`, 30, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const user = await sessionUser().catch(() => null);
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  try {
    const r = await toggleLike(Number(id), user ? `u:${user.email}` : `ip:${ip}`);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
