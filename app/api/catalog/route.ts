import { NextResponse } from "next/server";
import { listPlans, listServices, suggestServices } from "@/lib/catalog";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  if (q !== null) return NextResponse.json({ services: suggestServices(q) });
  return NextResponse.json({ services: listServices(), plans: listPlans().map((p) => ({ ...p, services: p.services.map((s) => s.slug) })) });
}
