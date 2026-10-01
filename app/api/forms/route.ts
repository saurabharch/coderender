import { NextResponse } from "next/server";
import { z } from "zod";
import { createForm, listForms } from "@/lib/forms";
import { sessionUser } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().min(1).max(80),
  fields: z.array(z.record(z.string(), z.unknown())),
  schema: z.record(z.string(), z.unknown()).optional(),
  successMessage: z.string().max(500).optional(),
  redirectUrl: z.string().max(300).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  captcha: z.enum(["off", "default", "slider"]).optional(),
});

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 200);
  return NextResponse.json({ forms: listForms({ status, limit }) });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad form" }, { status: 422 });
  try {
    const id = await createForm({ ...parsed.data, createdBy: user.email });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("required") ? 422 : 500 });
  }
}
