import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return new Response("login required", { status: 401 });
  let timer: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const beat = () => {
        try {
          const row = getDb().prepare("SELECT MAX(id) m FROM Notification").get() as { m: number };
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ latest: row.m ?? 0, ts: Date.now() })}\n\n`));
        } catch { /* client gone */ }
      };
      beat();
      timer = setInterval(beat, 5000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
