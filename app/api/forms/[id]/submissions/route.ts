import { NextResponse } from "next/server";
import { getFormById, listSubmissions } from "@/lib/forms";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const form = getFormById(Number(id));
  if (!form) return NextResponse.json({ error: "not found" }, { status: 404 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") || 100), 200);
  return NextResponse.json({
    form: { id: form.id, title: form.title, slug: form.slug },
    submissions: listSubmissions(form.id, limit),
    total: listSubmissions(form.id, 100000).length,
  });
}
