import { NextResponse } from "next/server";
import { z } from "zod";
import { docsCreate, docsRead, logDoc } from "@/lib/google";
import { sessionUser } from "@/lib/auth";

// GET ?id= → read a doc as text.
export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "doc id required" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...(await docsRead(user.email, id)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "docs read failed" }, { status: 422 });
  }
}

// POST {title, text} → create a Google Doc.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ title: z.string().min(1).max(150), text: z.string().max(15000).default("") })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad doc" }, { status: 422 });
  try {
    const r = await docsCreate(user.email, parsed.data.title, parsed.data.text);
    logDoc(user.email, r.id, parsed.data.title);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "docs create failed" }, { status: 422 });
  }
}
