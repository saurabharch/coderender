import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { parseLabelTemplate, templateName } from "@/lib/label-template";
import { shopGate } from "@/lib/shop-auth";

function tables(): void {
  getDb().exec(`CREATE TABLE IF NOT EXISTS LabelTemplate (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, settings TEXT NOT NULL DEFAULT '{}', updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
}

// GET → named templates. POST {op: save|remove, ...} (team write).
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  tables();
  const rows = getDb().prepare("SELECT id, name, settings, updatedAt FROM LabelTemplate ORDER BY name").all();
  return NextResponse.json({
    templates: (rows as { id: number; name: string; settings: string }[]).map((r) => {
      let settings: unknown = {};
      try { settings = JSON.parse(r.settings); } catch { /* keep */ }
      return { id: r.id, name: r.name, settings };
    }),
  });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  tables();
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "save") {
      const parsed = z.object({ op: z.literal("save"), name: z.string().min(1).max(60), settings: z.unknown() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad template" }, { status: 422 });
      const clean = parseLabelTemplate(parsed.data.settings);
      if (!clean) return NextResponse.json({ error: "bad settings" }, { status: 422 });
      const name = templateName(parsed.data.name);
      if (!name) return NextResponse.json({ error: "name required" }, { status: 422 });
      getDb().prepare("INSERT INTO LabelTemplate (name, settings) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET settings=excluded.settings, updatedAt=datetime('now')")
        .run(name, JSON.stringify(clean));
      return NextResponse.json({ ok: true, name });
    }
    if (body?.op === "remove") {
      const parsed = z.object({ op: z.literal("remove"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad remove" }, { status: 422 });
      getDb().prepare("DELETE FROM LabelTemplate WHERE id=?").run(parsed.data.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
