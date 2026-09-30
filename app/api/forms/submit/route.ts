import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const raw = ct.includes("application/json")
    ? await req.json().catch(() => null)
    : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const parsed = z.object({ slug: z.string().min(1), values: z.record(z.string(), z.string()).optional() }).safeParse(
    ct.includes("application/json") ? raw : { slug: String((raw as Record<string, unknown>).slug ?? ""), values: Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k]) => k !== "slug").map(([k, v]) => [k, String(v)])) }
  );
  if (!parsed.success) return NextResponse.json({ error: "bad submission" }, { status: 422 });
  const form = getDb().prepare("SELECT id FROM FormDef WHERE slug=? AND active=1").get(parsed.data.slug) as { id: number } | undefined;
  if (!form) return NextResponse.json({ error: "no form" }, { status: 404 });
  getDb().prepare("INSERT INTO Submission (formId, data) VALUES (?,?)").run(form.id, JSON.stringify(parsed.data.values ?? {}));
  const v = parsed.data.values ?? {};
  if (v.name && v.phone) {
    getDb().prepare("INSERT INTO Lead (name, phone, businessType, source, message) VALUES (?,?,?,?,?)")
      .run(String(v.name).slice(0, 80), String(v.phone).slice(0, 20), "general", `form:${parsed.data.slug}`, JSON.stringify(v).slice(0, 1000));
  }
  return ct.includes("application/json")
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(`/f/${parsed.data.slug}?e=ok`, new URL(req.url).origin), 303);
}
