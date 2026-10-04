import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|vote`, 30, 600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = z.object({
    threadId: z.number().int(),
    turnIdx: z.number().int().min(0),
    vote: z.enum(["up", "down", "fail"]),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad vote" }, { status: 422 });
  getDb().prepare("INSERT INTO Vote (threadId, turnIdx, vote) VALUES (?,?,?)")
    .run(parsed.data.threadId, parsed.data.turnIdx, parsed.data.vote);
  return NextResponse.json({ ok: true });
}
