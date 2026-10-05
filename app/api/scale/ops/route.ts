import { NextResponse } from "next/server";
import { exportCsv, importCsv, recentAudit, roleMatrix } from "@/lib/scale";
import { shopGate } from "@/lib/shop-auth";
import { scaleGate } from "@/lib/scale-auth";

// GET ?view=audit|roles|export=products|customers|stock
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "audit";
  if (view === "roles") return NextResponse.json({ matrix: roleMatrix() });
  const exp = url.searchParams.get("export");
  if (exp === "products" || exp === "customers" || exp === "stock") {
    return new Response(exportCsv(exp), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${exp}.csv"` },
    });
  }
  return NextResponse.json({ audit: recentAudit() });
}

// POST {import: products|customers, csv}
export async function POST(req: Request) {
  const g = await scaleGate(req, "settings");
  if (g instanceof NextResponse) return g;
  const body = await req.json().catch(() => null);
  if (body?.import !== "products" && body?.import !== "customers")
    return NextResponse.json({ error: "import products|customers" }, { status: 422 });
  if (typeof body?.csv !== "string" || !body.csv.trim())
    return NextResponse.json({ error: "csv required" }, { status: 422 });
  try {
    const r = await importCsv(body.import, body.csv, g.actor);
    return NextResponse.json({ ok: true, imported: r.ok, errors: r.errors });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "import failed" }, { status: 422 });
  }
}
