import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";

const schema = z.object({ slug: z.string().min(1).max(120), name: z.string().min(2).max(80), body: z.string().min(2).max(2000) });

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const input = ct.includes("application/json")
    ? await req.json().catch(() => null)
    : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const parsed = schema.safeParse(input);
  const back = new URL(req.url);
  if (!parsed.success) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "bad comment" }, { status: 422 })
      : NextResponse.redirect(new URL(`/blog/${String((input as Record<string, unknown>).slug ?? "")}?e=bad`, back.origin), 303);
  }
  const post = getDb().prepare("SELECT id FROM Post WHERE slug=?").get(parsed.data.slug) as { id: number } | undefined;
  if (!post) return NextResponse.json({ error: "no post" }, { status: 404 });
  getDb().prepare("INSERT INTO Comment (postId, name, body) VALUES (?,?,?)")
    .run(post.id, parsed.data.name, parsed.data.body);
  return ct.includes("application/json")
    ? NextResponse.json({ ok: true, moderated: true })
    : NextResponse.redirect(new URL(`/blog/${parsed.data.slug}?e=mod`, back.origin), 303);
}
