import { NextResponse } from "next/server";
import { getActiveFormBySlug } from "@/lib/forms";

// Public: fetch an active form by slug (schema + fields, no submission data).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = getActiveFormBySlug(slug);
  if (!form) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ form });
}
