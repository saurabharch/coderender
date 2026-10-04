import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTemplate, listTemplates, saveTemplate } from "@/lib/wa-crm";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ templates: listTemplates() });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(60),
    body: z.string().min(1).max(2000), lang: z.string().max(10).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad template" }, { status: 422 });
  try {
    const id = saveTemplate(parsed.data);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  deleteTemplate(Number(new URL(req.url).searchParams.get("id") || 0));
  return NextResponse.json({ ok: true });
}
