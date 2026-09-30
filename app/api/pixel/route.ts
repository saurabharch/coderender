import { getDb } from "@/lib/store";

const GIF = Buffer.from("R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==", "base64");

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    getDb().prepare("INSERT INTO Event (type, path, fingerprint) VALUES (?,?,?)")
      .run("page_view", url.searchParams.get("p") ?? "/", url.searchParams.get("f") ?? null);
  } catch { /* never break the pixel */ }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
