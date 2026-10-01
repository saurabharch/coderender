import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteForm, getFormById, updateForm } from "@/lib/forms";
import { sessionUser } from "@/lib/auth";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  fields: z.array(z.record(z.string(), z.unknown())).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  successMessage: z.string().max(500).optional(),
  redirectUrl: z.string().max(300).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  captcha: z.enum(["off", "default", "slider"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const form = getFormById(Number(id));
  if (!form) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ form });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad form" }, { status: 422 });
  try {
    await updateForm(Number(id), parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  await deleteForm(Number(id));
  return NextResponse.json({ ok: true });
}
