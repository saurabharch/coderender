import { NextResponse } from "next/server";
import { z } from "zod";
import { countApproved, createComment, nestedThread } from "@/lib/comments";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { sessionUser } from "@/lib/auth";

const postSchema = z.object({
  resourceType: z.string().min(1).max(30).optional(),
  resourceId: z.string().min(1).max(120).optional(),
  parentId: z.number().int().optional(),
  name: z.string().min(2).max(80),
  body: z.string().min(2).max(2000),
  // legacy blog shape
  slug: z.string().min(1).max(120).optional(),
});

function likeKey(req: Request, email?: string): string {
  if (email) return `u:${email}`;
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  return `ip:${ip}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resourceType = url.searchParams.get("resourceType") ?? "";
  const resourceId = url.searchParams.get("resourceId") ?? "";
  if (!resourceType || !resourceId) return NextResponse.json({ error: "bad thread" }, { status: 422 });
  const user = await sessionUser().catch(() => null);
  const key = likeKey(req, user?.email);
  if (url.searchParams.get("count") === "1")
    return NextResponse.json({ count: countApproved(resourceType, resourceId) });
  return NextResponse.json({ comments: nestedThread(resourceType, resourceId, key) });
}

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|comment`, 10, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json")
    ? await req.json().catch(() => null)
    : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const parsed = postSchema.safeParse(raw);
  const back = new URL(req.url);
  const redir = (e: string, slug: string) => NextResponse.redirect(new URL(`/blog/${slug}?e=${e}`, back.origin), 303);
  if (!parsed.success) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "bad comment" }, { status: 422 })
      : redir("bad", String((raw as Record<string, unknown>)?.slug ?? ""));
  }
  const d = parsed.data;
  const resourceType = d.resourceType || (d.slug ? "blog-post" : "");
  const resourceId = d.resourceId || d.slug || "";
  if (!resourceType || !resourceId) {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "bad comment" }, { status: 422 })
      : redir("bad", String(d.slug ?? ""));
  }
  const user = await sessionUser().catch(() => null);
  try {
    // Spam is shadow-accepted (stored hidden) so abusers learn nothing.
    const { status } = await createComment({
      resourceType, resourceId, parentId: d.parentId,
      name: d.name, body: d.body,
      authorEmail: user?.email, trusted: !!user,
    });
    void status;
    return ct.includes("application/json")
      ? NextResponse.json({ ok: true, moderated: true })
      : redir("mod", resourceType === "blog-post" ? resourceId : "");
  } catch {
    return ct.includes("application/json")
      ? NextResponse.json({ error: "bad comment" }, { status: 422 })
      : redir("bad", resourceType === "blog-post" ? resourceId : "");
  }
}
