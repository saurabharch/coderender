import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveFormBySlug, createSubmission } from "@/lib/forms";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { moderate } from "@/lib/moderate";

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|form-submit`, 20, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json")
    ? await req.json().catch(() => null)
    : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const parsed = z.object({ slug: z.string().min(1).max(80), values: z.record(z.string(), z.unknown()).optional() }).safeParse(
    ct.includes("application/json") ? raw : {
      slug: String((raw as Record<string, unknown>).slug ?? ""),
      values: Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k]) => k !== "slug")),
    }
  );
  if (!parsed.success) return NextResponse.json({ error: "bad submission" }, { status: 422 });
  if (moderate(JSON.stringify(parsed.data.values ?? {})).verdict === "block")
    return NextResponse.json({ error: "bad submission" }, { status: 422 });
  const form = getActiveFormBySlug(parsed.data.slug);
  if (!form) return NextResponse.json({ error: "no form" }, { status: 404 });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  try {
    await createSubmission(form, parsed.data.values ?? {}, {
      ip, ua: req.headers.get("user-agent") ?? "",
    });
  } catch (e) {
    const err = e as Error & { errors?: Record<string, string>; status?: number };
    if (err.status === 422) return NextResponse.json({ error: "validation failed", fields: err.errors }, { status: 422 });
    return NextResponse.json({ error: "bad submission" }, { status: 422 });
  }
  const message = form.successMessage || "Thanks for your submission!";
  if (ct.includes("application/json"))
    return NextResponse.json({ ok: true, message, redirectUrl: form.redirectUrl || undefined });
  return NextResponse.redirect(new URL(`/f/${form.slug}?e=ok`, new URL(req.url).origin), 303);
}
