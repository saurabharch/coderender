import { NextResponse } from "next/server";
import { z } from "zod";
import { listAssets, registerAsset } from "@/lib/media";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  return NextResponse.json(listAssets({
    q: url.searchParams.get("q") || undefined,
    folder: url.searchParams.get("folder") ?? undefined,
    mime: url.searchParams.get("mime") || undefined,
    limit: Math.min(Number(url.searchParams.get("limit") || 40), 100),
    offset: Math.max(Number(url.searchParams.get("offset") || 0), 0),
  }));
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    url: z.string().min(1).max(500),
    alt: z.string().max(160).optional(),
    folder: z.string().max(80).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad asset" }, { status: 422 });
  try {
    const id = await registerAsset(parsed.data);
    return NextResponse.json({ ok: true, id, url: parsed.data.url });
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 422 });
  }
}
