import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { pageVars } from "@/lib/uibuilder";

// Public composed-page data (what ServerLayerRenderer consumes).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blocks = getDb().prepare("SELECT id, type, title, body, props FROM PageBlock WHERE pageSlug=? ORDER BY ord").all(slug);
  if ((blocks as unknown[]).length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const vars = getDb().prepare("SELECT name, value FROM PageVar WHERE pageSlug=?").all(slug);
  return NextResponse.json({ slug, layers: blocks, vars: pageVars(vars as { name: string; value: string }[]) });
}
