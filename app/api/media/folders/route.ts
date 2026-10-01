import { NextResponse } from "next/server";
import { z } from "zod";
import { createFolder, listFolders } from "@/lib/media";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ folders: listFolders() });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ name: z.string().min(1).max(60), parentId: z.number().int().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad folder" }, { status: 422 });
  try {
    const id = createFolder(parsed.data.name, parsed.data.parentId);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "bad folder" }, { status: 422 });
  }
}
