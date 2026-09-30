import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";

export async function POST(req: Request) {
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
