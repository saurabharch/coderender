import { NextResponse } from "next/server";
import { createReadStream, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
};

// Disk fallback for /uploads/*: `next start` snapshots public/ at boot, so
// files uploaded at runtime 404 until restart. Static files win when present;
// this route serves everything else straight from disk.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const root = join(process.cwd(), "public", "uploads");
  const rel = normalize((path ?? []).join("/")).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = join(root, rel);
  if (rel === "" || !abs.startsWith(root + sep)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  try {
    const st = statSync(abs);
    if (!st.isFile()) throw new Error("not a file");
    const stream = createReadStream(abs);
    const readable = new ReadableStream({
      start(c) {
        stream.on("data", (d) => c.enqueue(d));
        stream.on("end", () => c.close());
        stream.on("error", (e) => c.error(e));
      },
      cancel() { stream.destroy(); },
    });
    return new Response(readable, {
      headers: {
        "content-type": MIME[abs.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream",
        "content-length": String(st.size),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
