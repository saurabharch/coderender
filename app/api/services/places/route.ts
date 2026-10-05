import { NextResponse } from "next/server";
import { z } from "zod";
import { listBranches, listTemplates, renderKind, saveBranch, saveTemplate } from "@/lib/serviceops";
import { shopGate } from "@/lib/shop-auth";

// GET ?what=branches|templates | ?render=kind&k=v...
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const render = url.searchParams.get("render");
  if (render) {
    const vars: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { if (k !== "render") vars[k] = v.slice(0, 500); });
    try {
      return NextResponse.json({ ok: true, text: renderKind(render, vars) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "render failed" }, { status: 422 });
    }
  }
  return NextResponse.json((url.searchParams.get("what") || "branches") === "templates"
    ? { templates: listTemplates() } : { branches: listBranches() });
}

// POST {name,...} → branch | {kind, body} → template.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.kind && body?.body !== undefined) {
      const parsed = z.object({ kind: z.enum(["receipt", "jobcard"]), body: z.string().min(1).max(8000) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad template" }, { status: 422 });
      saveTemplate(parsed.data.kind, parsed.data.body);
      return NextResponse.json({ ok: true });
    }
    const parsed = z.object({
      id: z.number().int().optional(), name: z.string().min(1).max(80),
      address: z.string().max(200).optional(), phone: z.string().max(20).optional(),
      active: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad branch" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveBranch(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
